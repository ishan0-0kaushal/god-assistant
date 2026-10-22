package expo.modules.steadynative

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView

/**
 * The full-screen wall shown over an app whose time is up (or during a focus session). A native
 * overlay window rather than an activity: it appears instantly, needs no JS, and covers the app
 * for as long as it stays in front. Calm on purpose — no red, no guilt — with the user's own
 * "why" as the loudest line and closing the app as the easiest action.
 */
class BlockScreen(private val ctx: Context, private val actions: Actions) {

  interface Actions {
    fun closeApp()
    fun openFocus()
    fun extend(pkg: String, label: String)
  }

  data class Model(
    val pkg: String,
    val label: String,
    val focus: Boolean,
    val usedMs: Long,
    val limitMinutes: Int,
    val extensionsUsed: Int,
    val focusLeftMs: Long,
    val toMidnightMs: Long,
    val screenTimeMs: Long,
    val why: String,
  )

  companion object {
    private const val BG = "#0B0B0D"
    private const val SURFACE = "#16161A"
    private const val LINE = "#2A2A31"
    private const val TEXT = "#F4F4F5"
    private const val DIM = "#8A8A93"
    private const val POMODORO_MS = 25 * 60_000L

    fun duration(ms: Long): String {
      val total = ms / 60_000
      if (total < 1) return "<1m"
      val h = total / 60
      val m = total % 60
      return if (h > 0) (if (m > 0) "${h}h ${m}m" else "${h}h") else "${m}m"
    }

    fun clock(ms: Long): String {
      val s = maxOf(0L, ms / 1000)
      return "${s / 60}:${(s % 60).toString().padStart(2, '0')}"
    }
  }

  private val wm = ctx.getSystemService(Context.WINDOW_SERVICE) as WindowManager
  private var root: View? = null
  private var key: String? = null
  private var detail: TextView? = null
  private var cost: TextView? = null

  val showing get() = root != null

  fun show(m: Model) {
    // Rebuild only when what's on screen changes shape; otherwise just refresh the numbers.
    val k = "${m.pkg}|${m.focus}|${m.extensionsUsed}|${m.why}"
    if (k != key) {
      hide()
      if (!build(m)) return
      key = k
    }
    detail?.text = detailText(m)
    cost?.text = costText(m)
  }

  fun hide() {
    root?.let { runCatching { wm.removeView(it) } }
    root = null
    key = null
    detail = null
    cost = null
  }

  private fun detailText(m: Model) =
    if (m.focus) "${clock(m.focusLeftMs)} left in your focus session."
    else "You used ${duration(m.usedMs)} (limit ${duration(m.limitMinutes * 60_000L)}). " +
      "Back at midnight, in ${duration(m.toMidnightMs)}."

  private fun costText(m: Model): String {
    val p = m.screenTimeMs / POMODORO_MS
    val base = "Today on your phone: ${duration(m.screenTimeMs)}"
    return if (p >= 1) "$base. That's $p Pomodoro${if (p == 1L) "" else "s"} of study." else "$base."
  }

  private fun dp(v: Int) = (v * ctx.resources.displayMetrics.density).toInt()

  private fun text(s: String, size: Float, color: String, bold: Boolean = false) = TextView(ctx).apply {
    text = s
    textSize = size
    setTextColor(Color.parseColor(color))
    gravity = Gravity.CENTER
    setLineSpacing(0f, 1.15f)
    if (bold) typeface = Typeface.DEFAULT_BOLD
  }

  private fun rounded(fill: String, stroke: String? = null) = GradientDrawable().apply {
    setColor(Color.parseColor(fill))
    cornerRadius = dp(16).toFloat()
    stroke?.let { setStroke(dp(1), Color.parseColor(it)) }
  }

  private fun <T : View> block(v: T, top: Int): T = v.apply {
    layoutParams = LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
    ).apply { topMargin = dp(top) }
  }

  private fun build(m: Model): Boolean {
    val root = LinearLayout(ctx).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.parseColor(BG))
      setPadding(dp(28), dp(48), dp(28), dp(32))
      isClickable = true // swallow touches so the app underneath can't be used
    }

    runCatching { ctx.packageManager.getApplicationIcon(m.pkg) }.getOrNull()?.let { icon ->
      root.addView(ImageView(ctx).apply {
        setImageDrawable(icon)
        alpha = 0.5f // a faded icon: the app is still there, just not now
        layoutParams = LinearLayout.LayoutParams(dp(56), dp(56))
      })
    }
    if (m.focus) root.addView(block(text("FOCUSING", 12f, DIM, bold = true).apply { letterSpacing = 0.15f }, 20))
    root.addView(block(
      text(if (m.focus) "${m.label} can wait." else "${m.label} is done for today.", 26f, TEXT, bold = true),
      if (m.focus) 6 else 20
    ))
    val detail = block(text("", 15f, DIM), 10)
    this.detail = detail
    root.addView(detail)

    if (m.why.isNotBlank()) {
      root.addView(block(LinearLayout(ctx).apply {
        orientation = LinearLayout.VERTICAL
        background = rounded(SURFACE)
        setPadding(dp(20), dp(16), dp(20), dp(18))
        addView(text("YOU SAID", 11f, DIM, bold = true).apply { letterSpacing = 0.15f })
        addView(text("“${m.why.trim()}”", 18f, TEXT).apply { setPadding(0, dp(6), 0, 0) })
      }, 28))
    }

    val cost = block(text("", 14f, DIM), 20)
    this.cost = cost
    root.addView(cost)

    root.addView(block(text("Close app", 16f, BG, bold = true).apply {
      background = rounded(TEXT)
      setPadding(0, dp(18), 0, dp(18))
      setOnClickListener { actions.closeApp() }
    }, 36))
    root.addView(block(text(if (m.focus) "Back to focus" else "Start a 25-min focus instead", 15f, TEXT).apply {
      background = rounded(BG, LINE)
      setPadding(0, dp(16), 0, dp(16))
      setOnClickListener { actions.openFocus() }
    }, 12))

    if (!m.focus) {
      val left = GuardService.MAX_EXTENSIONS - m.extensionsUsed
      root.addView(block(
        if (left > 0) text("I need it for something specific", 13f, DIM).apply {
          setPadding(0, dp(12), 0, dp(12))
          setOnClickListener { actions.extend(m.pkg, m.label) }
        } else text("No extensions left today.", 13f, DIM),
        20
      ))
    }

    val type = if (Build.VERSION.SDK_INT >= 26) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE
    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT, type,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
      PixelFormat.OPAQUE
    )
    return try {
      wm.addView(root, params)
      this.root = root
      true
    } catch (_: Exception) {
      false // overlay permission revoked; the service reports protection as off
    }
  }
}
