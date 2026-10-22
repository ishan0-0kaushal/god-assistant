package expo.modules.steadynative

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process
import android.provider.Settings

/** Small device lookups shared by the module and the service. */
object Device {
  /** Transient system surfaces that shouldn't count as "leaving" an app or as screen time. */
  val IGNORED = setOf(
    "android",
    "com.android.systemui",
    "com.google.android.permissioncontroller",
    "com.android.permissioncontroller",
  )

  fun launcher(ctx: Context): String? =
    ctx.packageManager.resolveActivity(
      Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), PackageManager.MATCH_DEFAULT_ONLY
    )?.activityInfo?.packageName

  /** Packages left out of screen-time totals: the home screen and Steady itself. */
  fun notScreenTime(ctx: Context) = setOfNotNull(launcher(ctx), ctx.packageName)

  fun label(ctx: Context, pkg: String): String = try {
    val pm = ctx.packageManager
    pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
  } catch (_: Exception) { pkg }

  fun hasUsageAccess(ctx: Context): Boolean {
    val ops = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= 29) {
      ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName)
    } else {
      @Suppress("DEPRECATION")
      ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName)
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  fun canOverlay(ctx: Context) = Settings.canDrawOverlays(ctx)

  fun goHome(ctx: Context) = ctx.startActivity(
    Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
  )
}
