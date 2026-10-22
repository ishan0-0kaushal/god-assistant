package expo.modules.steadynative

import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import android.util.Base64
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream

class SteadyNativeModule : Module() {
  private val ctx: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val now get() = System.currentTimeMillis()

  override fun definition() = ModuleDefinition {
    Name("SteadyNative")

    // Lists and maps cross the bridge as JSON strings; src/native.ts parses them.
    Function("getState") {
      Prefs.applyDue(ctx, now)
      mapOf(
        "enabled" to Prefs.isEnabled(ctx),
        "why" to Prefs.why(ctx),
        "limits" to Prefs.limitsJson(ctx),
        "pending" to Prefs.pendingJson(ctx),
        "extensionsToday" to org.json.JSONObject(Prefs.extensionsToday(ctx, now)).toString(),
        "focusStart" to Prefs.focusStart(ctx).toDouble(),
        "focusEnd" to Prefs.focusEnd(ctx).toDouble(),
        "focusStrict" to Prefs.focusStrict(ctx),
      )
    }

    Function("getLog") {
      mapOf("extensions" to Prefs.extensionLogJson(ctx), "sessions" to Prefs.sessionsJson(ctx))
    }

    Function("setEnabled") { on: Boolean ->
      Prefs.setEnabled(ctx, on)
      if (on) GuardService.start(ctx) else GuardService.stop(ctx)
    }

    Function("setWhy") { why: String -> Prefs.setWhy(ctx, why) }

    Function("setLimits") { limitsJson: String, pendingJson: String ->
      Prefs.setLimitsJson(ctx, limitsJson)
      Prefs.setPendingJson(ctx, pendingJson)
    }

    Function("startFocus") { minutes: Int, strict: Boolean ->
      Prefs.startFocus(ctx, minutes, strict, now)
      if (Prefs.isEnabled(ctx)) GuardService.start(ctx)
    }

    Function("endFocus") { Prefs.endFocus(ctx, now) }

    /** Foreground time per app between two instants, plus total screen time and pickups. */
    AsyncFunction("getUsage") { fromMs: Double, toMs: Double ->
      val usm = ctx.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val tally = UsageTally.scan(usm, fromMs.toLong(), toMs.toLong(), Device.IGNORED)
      val perApp = tally.snapshot(toMs.toLong(), Device.notScreenTime(ctx))
      mapOf(
        "perApp" to perApp.mapValues { it.value.toDouble() },
        "totalMs" to perApp.values.sum().toDouble(),
        "pickups" to tally.pickups,
      )
    }

    AsyncFunction("getInstalledApps") {
      val pm = ctx.packageManager
      val launcher = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
      pm.queryIntentActivities(launcher, 0)
        .map { it.activityInfo.applicationInfo }
        .distinctBy { it.packageName }
        .filter { it.packageName != ctx.packageName }
        .map {
          mapOf(
            "packageName" to it.packageName,
            "label" to pm.getApplicationLabel(it).toString(),
            "icon" to iconBase64(pm, it.packageName),
          )
        }
        .sortedBy { (it["label"] as String).lowercase() }
    }

    Function("getStatus") {
      mapOf("running" to GuardService.running, "lastSeen" to GuardService.lastSeen)
    }

    Function("getPermissions") {
      val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
      mapOf(
        "usage" to Device.hasUsageAccess(ctx),
        "overlay" to Device.canOverlay(ctx),
        "battery" to pm.isIgnoringBatteryOptimizations(ctx.packageName),
      )
    }

    Function("openUsageSettings") {
      openSettings(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
    }

    Function("openOverlaySettings") {
      openSettings(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${ctx.packageName}")))
    }

    Function("requestBatteryExemption") {
      openSettings(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${ctx.packageName}")))
    }

    // Called by the extension flow once its friction is paid: record it, hand back the app, close.
    Function("grantExtension") { pkg: String, reason: String ->
      if (Prefs.extensionsUsed(ctx, pkg, now) < GuardService.MAX_EXTENSIONS) {
        Prefs.addExtension(ctx, pkg, reason, now)
        ctx.packageManager.getLaunchIntentForPackage(pkg)?.let {
          ctx.startActivity(it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
      }
      finishGate()
    }

    // "Never mind": back to the home screen instead of the app.
    Function("closeGate") {
      Device.goHome(ctx)
      finishGate()
    }
  }

  private fun finishGate() {
    val gate = appContext.currentActivity as? GateActivity
    gate?.runOnUiThread { gate.finish() }
  }

  private fun openSettings(intent: Intent) =
    ctx.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))

  private fun iconBase64(pm: PackageManager, pkg: String): String? = try {
    val d = pm.getApplicationIcon(pkg)
    val size = 96
    val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    d.setBounds(0, 0, size, size)
    d.draw(Canvas(bmp))
    val out = ByteArrayOutputStream()
    bmp.compress(Bitmap.CompressFormat.PNG, 100, out)
    Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
  } catch (_: Exception) { null }
}
