package expo.modules.tradegatenative

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.os.Process
import android.provider.Settings
import android.util.Base64
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream

class TradegateNativeModule : Module() {
  private val ctx: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("TradegateNative")

    Function("getState") {
      mapOf("armed" to Prefs.isArmed(ctx), "guarded" to Prefs.guarded(ctx).toList())
    }

    Function("setArmed") { armed: Boolean ->
      Prefs.setArmed(ctx, armed)
      if (armed) GuardService.start(ctx) else GuardService.stop(ctx)
    }

    Function("setGuarded") { pkgs: List<String> ->
      Prefs.setGuarded(ctx, pkgs.toSet())
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
        "usage" to hasUsageAccess(),
        "overlay" to Settings.canDrawOverlays(ctx),
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

    // Called by the gate after all three steps: allow this open, hand over to the app, close the gate.
    Function("completeGate") { pkg: String ->
      GuardService.allowedPackage = pkg
      ctx.packageManager.getLaunchIntentForPackage(pkg)?.let {
        ctx.startActivity(it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
      val gate = appContext.currentActivity as? GateActivity
      gate?.runOnUiThread { gate.finish() }
      Unit
    }
  }

  private fun openSettings(intent: Intent) =
    ctx.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))

  private fun hasUsageAccess(): Boolean {
    val ops = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= 29) {
      ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName)
    } else {
      @Suppress("DEPRECATION")
      ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName)
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

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
