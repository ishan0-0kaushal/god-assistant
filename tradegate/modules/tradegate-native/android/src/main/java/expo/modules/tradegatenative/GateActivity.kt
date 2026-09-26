package expo.modules.tradegatenative

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate

/** Full-screen host for the JS "Gate" component. Back does nothing; leaving destroys it (noHistory). */
class GateActivity : ReactActivity() {

  companion object {
    const val EXTRA_PACKAGE = "packageName"
    const val EXTRA_LABEL = "appLabel"
  }

  override fun getMainComponentName() = "Gate"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
    object : DefaultReactActivityDelegate(this, "Gate", true) {
      override fun getLaunchOptions() = Bundle().apply {
        putString(EXTRA_PACKAGE, this@GateActivity.intent.getStringExtra(EXTRA_PACKAGE))
        putString(EXTRA_LABEL, this@GateActivity.intent.getStringExtra(EXTRA_LABEL))
      }
    }

  @Deprecated("Hard gate: back is swallowed")
  override fun onBackPressed() = Unit

  override fun invokeDefaultOnBackPressed() = Unit

  // Leaving the gate (home, recents, screen off) throws away progress; the service re-gates.
  override fun onStop() {
    super.onStop()
    if (!isChangingConfigurations) finish()
  }
}
