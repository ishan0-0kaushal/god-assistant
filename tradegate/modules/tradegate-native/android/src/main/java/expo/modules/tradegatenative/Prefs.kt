package expo.modules.tradegatenative

import android.content.Context

/** Single source of truth for guard state, shared by the JS module, service and boot receiver. */
object Prefs {
  private const val FILE = "tradegate"
  private const val KEY_ARMED = "armed"
  private const val KEY_GUARDED = "guarded"

  private fun prefs(ctx: Context) = ctx.applicationContext.getSharedPreferences(FILE, Context.MODE_PRIVATE)

  fun isArmed(ctx: Context) = prefs(ctx).getBoolean(KEY_ARMED, false)
  fun setArmed(ctx: Context, armed: Boolean) = prefs(ctx).edit().putBoolean(KEY_ARMED, armed).apply()

  fun guarded(ctx: Context): Set<String> = prefs(ctx).getStringSet(KEY_GUARDED, emptySet())!!.toSet()
  fun setGuarded(ctx: Context, pkgs: Set<String>) = prefs(ctx).edit().putStringSet(KEY_GUARDED, pkgs.toSet()).apply()
}
