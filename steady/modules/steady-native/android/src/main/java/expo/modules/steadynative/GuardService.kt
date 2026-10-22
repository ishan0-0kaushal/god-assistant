package expo.modules.steadynative

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

/**
 * Watches the foreground app while Steady is on. Tallies today's time per app from the usage
 * event stream; when a limited app runs out of time (or a focus session is running), covers it
 * with [BlockScreen]. Warns at 5 and 1 minute left so the wall never comes as a surprise.
 */
class GuardService : Service(), BlockScreen.Actions {

  companion object {
    private const val CHANNEL_GUARD = "steady_guard"
    private const val CHANNEL_ALERTS = "steady_alerts"
    private const val NOTIFICATION_ID = 7301
    private const val PROTECTION_ID = 7302
    private const val FOCUS_DONE_ID = 7303
    private const val POLL_MS = 400L
    /** Events can land in the log slightly late, so each query overlaps the previous one. */
    private const val LOOKBACK_MS = 5000L
    private const val HEALTH_MS = 15_000L

    /** Mirrors the extension ladder in src/limits.ts: 2 extensions a day, 5 minutes each. */
    const val MAX_EXTENSIONS = 2
    const val EXTENSION_MINUTES = 5

    /** Diagnostics surfaced on the home screen. */
    @Volatile var running = false
    @Volatile var lastSeen: String? = null

    fun start(ctx: Context) {
      ContextCompat.startForegroundService(ctx, Intent(ctx, GuardService::class.java))
    }

    fun stop(ctx: Context) {
      ctx.stopService(Intent(ctx, GuardService::class.java))
    }

    fun allowedMs(limitMinutes: Int, extensionsUsed: Int) =
      (limitMinutes + EXTENSION_MINUTES * minOf(extensionsUsed, MAX_EXTENSIONS)) * 60_000L
  }

  private val handler = Handler(Looper.getMainLooper())
  private lateinit var usm: UsageStatsManager
  private lateinit var power: PowerManager
  private lateinit var nm: NotificationManager
  private lateinit var block: BlockScreen
  private lateinit var tally: UsageTally
  private lateinit var excluded: Set<String>
  private var lastEventTs = 0L
  private var foreground: String? = null
  /** "pkg:extensions" → highest warning sent today (1 = five minutes, 2 = one minute). An extension re-arms them. */
  private val warned = HashMap<String, Int>()
  private var lastHealthCheck = 0L
  private var notificationText: String? = null

  private val tick = object : Runnable {
    override fun run() {
      runCatching { poll() }
      handler.postDelayed(this, POLL_MS)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    power = getSystemService(Context.POWER_SERVICE) as PowerManager
    nm = getSystemService(NotificationManager::class.java)
    block = BlockScreen(this, this)
    createChannels()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    ServiceCompat.startForeground(
      this, NOTIFICATION_ID, buildNotification(statusText(System.currentTimeMillis())),
      if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
    )
    if (!Prefs.isEnabled(this)) {
      stopSelf()
      return START_NOT_STICKY
    }
    // The app calls start() on every refresh; only the first one sets up, so warnings aren't re-sent.
    if (!running) {
      rescan(System.currentTimeMillis())
      handler.post(tick)
      running = true
    }
    return START_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(tick)
    block.hide()
    running = false
    super.onDestroy()
  }

  /** Rebuilds today's tally from midnight (on start and when the day rolls over). */
  private fun rescan(now: Long) {
    excluded = Device.notScreenTime(this)
    tally = UsageTally.scan(usm, dayStart(now), now, Device.IGNORED)
    lastEventTs = now
    foreground = tally.current
    warned.clear()
  }

  private fun poll() {
    val now = System.currentTimeMillis()
    if (now - lastHealthCheck > HEALTH_MS) {
      lastHealthCheck = now
      checkProtection()
    }
    if (!power.isInteractive) return // nothing can be used with the screen off
    if (dayStart(now) != tally.from) rescan(now)

    val events = usm.queryEvents(minOf(lastEventTs, now - LOOKBACK_MS), now)
    val e = UsageEvents.Event()
    while (events.hasNextEvent()) {
      events.getNextEvent(e)
      // Replaying an old event would double-count time, so only handle new ones.
      if (e.timeStamp <= lastEventTs) continue
      lastEventTs = e.timeStamp
      tally.feed(e.eventType, e.packageName, e.timeStamp)
      if (e.eventType == UsageEvents.Event.ACTIVITY_RESUMED && e.packageName !in Device.IGNORED) {
        foreground = e.packageName
        lastSeen = e.packageName
      }
    }

    Prefs.applyDue(this, now)
    val focusEnd = Prefs.focusEnd(this)
    if (focusEnd in 1..now) finishFocus(now)
    updateNotification(now)
    decide(foreground, now)
  }

  private fun decide(fg: String?, now: Long) {
    val limit = fg?.let { Prefs.limits(this)[it] }
    if (fg == null || fg == packageName || limit == null) return block.hide()

    val focusEnd = Prefs.focusEnd(this)
    val used = tally.usedMs(fg, now)
    val ext = Prefs.extensionsUsed(this, fg, now)
    val left = allowedMs(limit, ext) - used
    val focusing = focusEnd > now
    if (!focusing && left > 0) {
      block.hide()
      warn(fg, ext, left)
      return
    }
    block.show(BlockScreen.Model(
      pkg = fg,
      label = Device.label(this, fg),
      focus = focusing,
      usedMs = used,
      limitMinutes = limit,
      extensionsUsed = ext,
      focusLeftMs = focusEnd - now,
      toMidnightMs = dayStart(now) + 24 * 60 * 60 * 1000L - now,
      screenTimeMs = tally.snapshot(now, excluded).values.sum(),
      why = Prefs.why(this),
    ))
  }

  private fun warn(pkg: String, ext: Int, leftMs: Long) {
    val level = if (leftMs <= 60_000) 2 else if (leftMs <= 5 * 60_000) 1 else 0
    val key = "$pkg:$ext"
    if (level <= (warned[key] ?: 0)) return
    warned[key] = level
    val label = Device.label(this, pkg)
    alert(pkg.hashCode(), "$label: ${if (level == 2) "1 minute" else "5 minutes"} left today",
      "Finish what you're doing. It locks at 0.")
  }

  private fun finishFocus(now: Long) {
    val minutes = (Prefs.focusEnd(this) - Prefs.focusStart(this)) / 60_000
    Prefs.endFocus(this, now)
    alert(FOCUS_DONE_ID, "Focus done: $minutes minutes", "Take a 5-minute break away from the screen.")
  }

  /** Tamper awareness: tell the user when a permission Steady depends on has been taken away. */
  private fun checkProtection() {
    val missing = listOfNotNull(
      if (!Device.hasUsageAccess(this)) "usage access" else null,
      if (!Device.canOverlay(this)) "display over other apps" else null,
    )
    if (missing.isEmpty()) return nm.cancel(PROTECTION_ID)
    alert(PROTECTION_ID, "Protection is off", "Steady lost ${missing.joinToString(" and ")}. Tap to turn it back on.", ongoing = true)
  }

  // BlockScreen.Actions

  override fun closeApp() {
    Device.goHome(this)
  }

  override fun openFocus() {
    startActivity(
      Intent(Intent.ACTION_VIEW, Uri.parse("steady://focus")).setPackage(packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    )
  }

  override fun extend(pkg: String, label: String) {
    startActivity(
      Intent(this, GateActivity::class.java)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK or Intent.FLAG_ACTIVITY_NO_ANIMATION)
        .putExtra(GateActivity.EXTRA_PACKAGE, pkg)
        .putExtra(GateActivity.EXTRA_LABEL, label)
        .putExtra(GateActivity.EXTRA_USED, Prefs.extensionsUsed(this, pkg, System.currentTimeMillis()))
    )
  }

  // Notifications

  private fun createChannels() {
    if (Build.VERSION.SDK_INT < 26) return
    nm.createNotificationChannel(NotificationChannel(CHANNEL_GUARD, "Steady is on", NotificationManager.IMPORTANCE_LOW))
    nm.createNotificationChannel(NotificationChannel(CHANNEL_ALERTS, "Time warnings", NotificationManager.IMPORTANCE_HIGH))
  }

  private fun openApp() = packageManager.getLaunchIntentForPackage(packageName)?.let {
    PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE)
  }

  private fun statusText(now: Long): String {
    val focusEnd = Prefs.focusEnd(this)
    if (focusEnd > now) return "Focusing: ${(focusEnd - now + 59_999) / 60_000} min left"
    val n = Prefs.limits(this).size
    return "Limits on for $n app${if (n == 1) "" else "s"}"
  }

  private fun updateNotification(now: Long) {
    val text = statusText(now)
    if (text == notificationText) return
    nm.notify(NOTIFICATION_ID, buildNotification(text))
  }

  private fun buildNotification(text: String): Notification {
    notificationText = text
    return NotificationCompat.Builder(this, CHANNEL_GUARD)
      .setSmallIcon(R.drawable.steady_notification)
      .setContentTitle("Steady is on")
      .setContentText(text)
      .setContentIntent(openApp())
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .build()
  }

  private fun alert(id: Int, title: String, text: String, ongoing: Boolean = false) {
    nm.notify(id, NotificationCompat.Builder(this, CHANNEL_ALERTS)
      .setSmallIcon(R.drawable.steady_notification)
      .setContentTitle(title)
      .setContentText(text)
      .setContentIntent(openApp())
      .setOngoing(ongoing)
      .setAutoCancel(!ongoing)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .build())
  }
}
