package expo.modules.steadynative

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate

/** Full-screen host for the JS "Extend" flow. Back does nothing; leaving destroys it (noHistory). */
class GateActivity : ReactActivity() {

  companion object {
    const val EXTRA_PACKAGE = "packageName"
    const val EXTRA_LABEL = "appLabel"
    const val EXTRA_USED = "extensionsUsed"
  }

  override fun getMainComponentName() = "Extend"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
    object : DefaultReactActivityDelegate(this, "Extend", true) {
      override fun getLaunchOptions() = Bundle().apply {
        putString(EXTRA_PACKAGE, this@GateActivity.intent.getStringExtra(EXTRA_PACKAGE))
        putString(EXTRA_LABEL, this@GateActivity.intent.getStringExtra(EXTRA_LABEL))
        putInt(EXTRA_USED, this@GateActivity.intent.getIntExtra(EXTRA_USED, 0))
      }
    }

  @Deprecated("Hard gate: back is swallowed")
  override fun onBackPressed() = Unit

  override fun invokeDefaultOnBackPressed() = Unit

  // Leaving the flow (home, recents, screen off) throws away progress, waits included.
  override fun onStop() {
    super.onStop()
    if (!isChangingConfigurations) finish()
  }
}
