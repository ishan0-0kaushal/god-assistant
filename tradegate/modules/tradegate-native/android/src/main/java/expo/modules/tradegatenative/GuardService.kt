package expo.modules.tradegatenative

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
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

/**
 * Polls UsageStatsManager for the foreground app while armed. When a guarded app comes to the
 * front, launches [GateActivity] on top of it. A guarded app that passed the gate stays allowed
 * only until the user switches to something else — the next open is gated again.
 */
class GuardService : Service() {

  companion object {
    private const val CHANNEL_ID = "tradegate_guard"
    private const val NOTIFICATION_ID = 7201
    private const val POLL_MS = 400L
    private const val RELAUNCH_MS = 1500L
    /** Events can land in the log slightly late, so each query overlaps the previous one. */
    private const val LOOKBACK_MS = 5000L

    /** Package that completed the gate and may stay open until the user leaves it. */
    @Volatile var allowedPackage: String? = null

    /** Diagnostics surfaced on the home screen. */
    @Volatile var running = false
    @Volatile var lastSeen: String? = null

    /** Transient system surfaces that shouldn't count as "leaving" an app. */
    private val IGNORED = setOf(
      "android",
      "com.android.systemui",
      "com.google.android.permissioncontroller",
      "com.android.permissioncontroller",
    )

    fun start(ctx: Context) {
      ContextCompat.startForegroundService(ctx, Intent(ctx, GuardService::class.java))
    }

    fun stop(ctx: Context) {
      allowedPackage = null
      ctx.stopService(Intent(ctx, GuardService::class.java))
    }
  }

  private val handler = Handler(Looper.getMainLooper())
  private lateinit var usm: UsageStatsManager
  private lateinit var power: PowerManager
  private var lastEventTs = 0L
  private var foreground: String? = null
  private var lastGateLaunch = 0L
  private lateinit var wm: WindowManager
  private var overlay: View? = null

  private val tick = object : Runnable {
    override fun run() {
      poll()
      handler.postDelayed(this, POLL_MS)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    power = getSystemService(Context.POWER_SERVICE) as PowerManager
    wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    ServiceCompat.startForeground(
      this, NOTIFICATION_ID, buildNotification(),
      if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
    )
    if (!Prefs.isArmed(this)) {
      stopSelf()
      return START_NOT_STICKY
    }
    handler.removeCallbacks(tick)
    lastEventTs = System.currentTimeMillis() - 10_000
    handler.post(tick)
    running = true
    return START_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(tick)
    hideOverlay()
    running = false
    super.onDestroy()
  }

  private fun poll() {
    if (!power.isInteractive) return // nothing can be opened with the screen off
    val now = System.currentTimeMillis()
    val events = usm.queryEvents(minOf(lastEventTs, now - LOOKBACK_MS), now)
    val e = UsageEvents.Event()
    while (events.hasNextEvent()) {
      events.getNextEvent(e)
      // Replaying an old event would wrongly clear the allowance, so only handle new ones.
      if (e.timeStamp <= lastEventTs) continue
      lastEventTs = e.timeStamp
      if (e.eventType == UsageEvents.Event.ACTIVITY_RESUMED) onResumed(e.packageName, e.className)
    }

    // Re-assert the gate if the user is sitting in a guarded app without having passed it
    // (gate launch failed, or they escaped it via recents).
    val fg = foreground ?: return
    val gated = fg != allowedPackage && fg in Prefs.guarded(this)
    if (!gated) hideOverlay()
    else if (now - lastGateLaunch > RELAUNCH_MS) launchGate(fg)
  }

  private fun onResumed(pkg: String, cls: String?) {
    if (pkg in IGNORED) return
    lastSeen = pkg
    if (pkg == packageName && cls == GateActivity::class.java.name) {
      foreground = pkg
      hideOverlay() // the gate itself is up now
      return
    }
    if (pkg != allowedPackage) allowedPackage = null
    foreground = pkg
  }

  private fun launchGate(pkg: String) {
    lastGateLaunch = System.currentTimeMillis()
    val label = try {
      packageManager.getApplicationLabel(packageManager.getApplicationInfo(pkg, 0)).toString()
    } catch (_: Exception) { pkg }
    // Cover the app first: an overlay window always works with "Display over other apps", and a
    // visible overlay is what lets Android (and OEM skins) allow the activity launch below.
    showOverlay(pkg, label)
    openGate(pkg, label)
  }

  private fun openGate(pkg: String, label: String) {
    try {
      startActivity(
        Intent(this, GateActivity::class.java)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK or Intent.FLAG_ACTIVITY_NO_ANIMATION)
          .putExtra(GateActivity.EXTRA_PACKAGE, pkg)
          .putExtra(GateActivity.EXTRA_LABEL, label)
      )
    } catch (_: Exception) {
      // Blocked; the overlay's button retries with a user tap, which is always allowed.
    }
  }

  private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

  private fun showOverlay(pkg: String, label: String) {
    if (overlay != null) return
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.parseColor("#0B0B0D"))
      setPadding(dp(32), dp(32), dp(32), dp(32))
      isClickable = true // swallow touches so the app underneath can't be used
    }
    fun text(s: String, size: Float, color: String, bold: Boolean = false) = TextView(this).apply {
      text = s
      textSize = size
      setTextColor(Color.parseColor(color))
      gravity = Gravity.CENTER
      if (bold) typeface = Typeface.DEFAULT_BOLD
    }
    root.addView(text("KILL SWITCH ARMED", 13f, "#FF453A", bold = true))
    root.addView(text(label, 30f, "#F4F4F5", bold = true).apply { setPadding(0, dp(12), 0, dp(8)) })
    root.addView(text("Breathe, move and write before you trade.", 15f, "#8A8A93"))
    root.addView(text("Begin", 16f, "#0B0B0D", bold = true).apply {
      background = GradientDrawable().apply { setColor(Color.parseColor("#F4F4F5")); cornerRadius = dp(16).toFloat() }
      setPadding(dp(48), dp(18), dp(48), dp(18))
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT
      ).apply { topMargin = dp(40) }
      setOnClickListener { openGate(pkg, label) }
    })
    val type = if (Build.VERSION.SDK_INT >= 26) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE
    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT, type,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
      PixelFormat.OPAQUE
    )
    try {
      wm.addView(root, params)
      overlay = root
    } catch (_: Exception) {
      // Overlay permission revoked; nothing more we can do from the background.
    }
  }

  private fun hideOverlay() {
    overlay?.let { runCatching { wm.removeView(it) } }
    overlay = null
  }

  private fun buildNotification(): Notification {
    val nm = getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL_ID) == null) {
      nm.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Kill switch", NotificationManager.IMPORTANCE_LOW)
      )
    }
    val open = packageManager.getLaunchIntentForPackage(packageName)?.let {
      PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE)
    }
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.drawable.tradegate_notification)
      .setContentTitle("Kill switch armed")
      .setContentText("Trading apps are gated. Open TradeGate to disarm.")
      .setContentIntent(open)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .build()
  }
}
