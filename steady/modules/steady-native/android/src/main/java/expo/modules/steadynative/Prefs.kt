package expo.modules.steadynative

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

/** Local midnight at or before [now]. */
fun dayStart(now: Long): Long = Calendar.getInstance().apply {
  timeInMillis = now
  set(Calendar.HOUR_OF_DAY, 0)
  set(Calendar.MINUTE, 0)
  set(Calendar.SECOND, 0)
  set(Calendar.MILLISECOND, 0)
}.timeInMillis

/**
 * Single source of truth for limits and sessions, shared by the JS module, service and boot
 * receiver. Rules for *changing* limits (tighten now, loosen at midnight) live in src/limits.ts;
 * this only stores them and applies queued changes when they come due.
 */
object Prefs {
  private const val FILE = "steady"
  private const val KEY_ENABLED = "enabled"
  private const val KEY_WHY = "why"
  private const val KEY_LIMITS = "limits"
  private const val KEY_PENDING = "pending"
  private const val KEY_EXT_DAY = "extDay"
  private const val KEY_EXT = "ext"
  private const val KEY_EXT_LOG = "extLog"
  private const val KEY_FOCUS_START = "focusStart"
  private const val KEY_FOCUS_END = "focusEnd"
  private const val KEY_FOCUS_STRICT = "focusStrict"
  private const val KEY_SESSIONS = "sessions"
  private const val LOG_CAP = 300

  private fun prefs(ctx: Context) = ctx.applicationContext.getSharedPreferences(FILE, Context.MODE_PRIVATE)

  fun isEnabled(ctx: Context) = prefs(ctx).getBoolean(KEY_ENABLED, false)
  fun setEnabled(ctx: Context, on: Boolean) = prefs(ctx).edit().putBoolean(KEY_ENABLED, on).apply()

  fun why(ctx: Context) = prefs(ctx).getString(KEY_WHY, "")!!
  fun setWhy(ctx: Context, why: String) = prefs(ctx).edit().putString(KEY_WHY, why).apply()

  // Limits: package → minutes per day.
  fun limitsJson(ctx: Context) = prefs(ctx).getString(KEY_LIMITS, "{}")!!
  fun setLimitsJson(ctx: Context, json: String) = prefs(ctx).edit().putString(KEY_LIMITS, json).apply()
  fun limits(ctx: Context): Map<String, Int> {
    val o = JSONObject(limitsJson(ctx))
    return o.keys().asSequence().associateWith { o.getInt(it) }
  }

  // Pending loosening changes: [{pkg, minutes|null, effectiveAt}].
  fun pendingJson(ctx: Context) = prefs(ctx).getString(KEY_PENDING, "[]")!!
  fun setPendingJson(ctx: Context, json: String) = prefs(ctx).edit().putString(KEY_PENDING, json).apply()

  /** Moves due pending changes into the limits (mirrors applyDue in src/limits.ts). */
  fun applyDue(ctx: Context, now: Long) {
    val pending = JSONArray(pendingJson(ctx))
    if (pending.length() == 0) return
    val limits = JSONObject(limitsJson(ctx))
    val left = JSONArray()
    var changed = false
    for (i in 0 until pending.length()) {
      val p = pending.getJSONObject(i)
      if (p.getLong("effectiveAt") > now) { left.put(p); continue }
      changed = true
      if (p.isNull("minutes")) limits.remove(p.getString("pkg"))
      else limits.put(p.getString("pkg"), p.getInt("minutes"))
    }
    if (changed) prefs(ctx).edit()
      .putString(KEY_LIMITS, limits.toString())
      .putString(KEY_PENDING, left.toString())
      .apply()
  }

  // Extensions used today: package → count. Stored with the day they belong to.
  private fun extToday(ctx: Context, now: Long): JSONObject {
    val p = prefs(ctx)
    return if (p.getLong(KEY_EXT_DAY, 0) == dayStart(now)) JSONObject(p.getString(KEY_EXT, "{}")!!) else JSONObject()
  }

  fun extensionsToday(ctx: Context, now: Long): Map<String, Int> {
    val o = extToday(ctx, now)
    return o.keys().asSequence().associateWith { o.getInt(it) }
  }

  fun extensionsUsed(ctx: Context, pkg: String, now: Long) = extToday(ctx, now).optInt(pkg, 0)

  fun addExtension(ctx: Context, pkg: String, reason: String, now: Long) {
    val ext = extToday(ctx, now)
    ext.put(pkg, ext.optInt(pkg, 0) + 1)
    val log = append(JSONArray(prefs(ctx).getString(KEY_EXT_LOG, "[]")!!),
      JSONObject().put("ts", now).put("pkg", pkg).put("reason", reason))
    prefs(ctx).edit()
      .putLong(KEY_EXT_DAY, dayStart(now))
      .putString(KEY_EXT, ext.toString())
      .putString(KEY_EXT_LOG, log.toString())
      .apply()
  }

  fun extensionLogJson(ctx: Context) = prefs(ctx).getString(KEY_EXT_LOG, "[]")!!

  // Focus session.
  fun focusEnd(ctx: Context) = prefs(ctx).getLong(KEY_FOCUS_END, 0)
  fun focusStart(ctx: Context) = prefs(ctx).getLong(KEY_FOCUS_START, 0)
  fun focusStrict(ctx: Context) = prefs(ctx).getBoolean(KEY_FOCUS_STRICT, false)

  fun startFocus(ctx: Context, minutes: Int, strict: Boolean, now: Long) = prefs(ctx).edit()
    .putLong(KEY_FOCUS_START, now)
    .putLong(KEY_FOCUS_END, now + minutes * 60_000L)
    .putBoolean(KEY_FOCUS_STRICT, strict)
    .apply()

  /** Ends the running session (if any) and logs it. */
  fun endFocus(ctx: Context, now: Long) {
    val start = focusStart(ctx)
    val end = focusEnd(ctx)
    if (end == 0L) return
    val stoppedAt = minOf(now, end)
    val log = append(JSONArray(prefs(ctx).getString(KEY_SESSIONS, "[]")!!),
      JSONObject().put("start", start).put("end", stoppedAt).put("completed", now >= end))
    prefs(ctx).edit()
      .putLong(KEY_FOCUS_START, 0)
      .putLong(KEY_FOCUS_END, 0)
      .putString(KEY_SESSIONS, log.toString())
      .apply()
  }

  fun sessionsJson(ctx: Context) = prefs(ctx).getString(KEY_SESSIONS, "[]")!!

  private fun append(arr: JSONArray, item: JSONObject): JSONArray {
    arr.put(item)
    if (arr.length() <= LOG_CAP) return arr
    val out = JSONArray()
    for (i in arr.length() - LOG_CAP until arr.length()) out.put(arr.get(i))
    return out
  }
}
