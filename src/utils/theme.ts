export type ThemeMode = 'dark' | 'light';

export function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem('ecode_theme');
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme: ThemeMode): void {
  try {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      // Update meta theme-color for Android status bar
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', '#f8faf6');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', '#121316');
    }
    localStorage.setItem('ecode_theme', theme);
    const systemBars = (window as unknown as {
      Capacitor?: { Plugins?: { SystemBars?: { setStyle?: (opts: { style: string }) => Promise<void> } } };
    }).Capacitor?.Plugins?.SystemBars;
    if (systemBars?.setStyle) {
      Promise.resolve(systemBars.setStyle({ style: theme === 'dark' ? 'DARK' : 'LIGHT' })).catch(() => {});
    }
  } catch (e) {
    console.error('Error applying theme:', e);
  }
}
