// Visual Constants
// Todo: Harmonize with chart colors and CSS varibaels
export const uiFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
export const isMobile = window.innerWidth < 920

export const colors = {
    primary: '#0a0a12',
    secondary: '#151520',
    accent: '#4a9eff',
    success: '#00e676',
    warning: '#ffc107',
    error: '#ff5252',
    text: '#f5f5f7',
    textDim: 'rgba(245, 245, 247, 0.7)',
    border: 'rgba(255, 255, 255, 0.12)',
    panelBg: 'rgba(10, 10, 18, 0.95)',
    glassBg: 'rgba(255, 255, 255, 0.05)',
    selection: '#FFD700',
}

export const layout = {
    radius: 8,
    spacing: 16
}

export const effects = {
    shadowBlur: { light: 4, medium: 8, heavy: 12 },
    pulseSpeed: 0.005,
}

export const performance = {
    maxEffects: 20,
    minFrameTime: 16 // ~60fps
}


