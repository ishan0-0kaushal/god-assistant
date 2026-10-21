import {Config} from '@remotion/cli/config';

// Lossless frame capture, high-quality x264 and BT.709 color so the upload
// matches what YouTube expects.
Config.setVideoImageFormat('png');
Config.setCodec('h264');
Config.setCrf(15);
Config.setX264Preset('slow');
Config.setColorSpace('bt709');

// Use a local Chrome when one is provided instead of downloading one.
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
	Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
