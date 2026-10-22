package expo.modules.steadynative

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager

/**
 * Foreground time per app since [from], built from the usage event stream: an app is "in front"
 * from its ACTIVITY_RESUMED until another app resumes or the screen turns off/locks. Time before
 * [from] is never credited, so an app left open across midnight starts counting at midnight.
 */
class UsageTally(val from: Long, private val ignored: Set<String>) {

  companion object {
    /** Look back before [from] to learn which app was already open when the window started. */
    private const val LOOKBACK_MS = 3 * 60 * 60 * 1000L

    fun scan(usm: UsageStatsManager, from: Long, to: Long, ignored: Set<String>): UsageTally {
      val t = UsageTally(from, ignored)
      val events = usm.queryEvents(from - LOOKBACK_MS, to)
      val e = UsageEvents.Event()
      while (events.hasNextEvent()) {
        events.getNextEvent(e)
        t.feed(e.eventType, e.packageName, e.timeStamp)
      }
      return t
    }
  }

  private val ms = HashMap<String, Long>()
  var pickups = 0
    private set
  var current: String? = null
    private set
  private var since = 0L

  fun feed(type: Int, pkg: String, ts: Long) {
    when (type) {
      UsageEvents.Event.ACTIVITY_RESUMED -> if (pkg !in ignored) switchTo(pkg, ts)
      UsageEvents.Event.SCREEN_NON_INTERACTIVE, UsageEvents.Event.KEYGUARD_SHOWN -> switchTo(null, ts)
      UsageEvents.Event.KEYGUARD_HIDDEN -> if (ts >= from) pickups++
    }
  }

  private fun switchTo(pkg: String?, ts: Long) {
    current?.let { credit(it, since, ts) }
    current = pkg
    since = ts
  }

  private fun credit(pkg: String, start: Long, end: Long) {
    val s = maxOf(start, from)
    if (end > s) ms[pkg] = (ms[pkg] ?: 0L) + (end - s)
  }

  /** Time in [pkg] so far, including the open stretch if it's in front right now. */
  fun usedMs(pkg: String, now: Long): Long {
    var total = ms[pkg] ?: 0L
    if (current == pkg) total += maxOf(0L, now - maxOf(since, from))
    return total
  }

  /** Every app's time so far, minus [exclude] (launcher, this app). */
  fun snapshot(now: Long, exclude: Set<String>): Map<String, Long> {
    val keys = ms.keys + listOfNotNull(current)
    return keys.filter { it !in exclude }.associateWith { usedMs(it, now) }.filterValues { it > 0 }
  }
}
