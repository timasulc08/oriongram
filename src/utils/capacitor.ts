import { getPlatform, isNativeApp } from './platform';

export async function initCapacitorPlugins() {
  if (!isNativeApp()) return;

  try {
    // Status Bar
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#141218' });
  } catch (e) {
    console.warn('StatusBar plugin error:', e);
  }

  try {
    // Keyboard
    const { Keyboard } = await import('@capacitor/keyboard');
    Keyboard.addListener('keyboardWillShow', (info) => {
      document.documentElement.style.setProperty('--keyboard-height', info.keyboardHeight + 'px');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.documentElement.style.setProperty('--keyboard-height', '0px');
    });
  } catch (e) {
    console.warn('Keyboard plugin error:', e);
  }

  try {
    // Splash Screen — скрываем
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch (e) {
    console.warn('SplashScreen plugin error:', e);
  }

  try {
    // Back button на Android
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => {
      // Будем обрабатывать в React
      window.dispatchEvent(new CustomEvent('hardwareBackPress'));
    });
  } catch (e) {
    console.warn('App plugin error:', e);
  }
}
