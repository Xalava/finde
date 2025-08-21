let canvas // Canvas element reference
let handleCanvasClick

const MAX_ZOOM = 5
const MIN_ZOOM = 0.5
const camera = {
    x: 0,
    y: 0,
    zoom: 1
}

// Minimal mobile touch state
let touchState = {
    startX: 0,
    startY: 0,
    startTime: 0,
    lastX: 0,
    lastY: 0,
    lastPinchDistance: 0,
    isPinching: false,
    hasMoved: false
}

// Constants for swipe prevention
const SWIPE_THRESHOLD = 30
const SWIPE_TIME_LIMIT = 300
const EDGE_THRESHOLD = 50
// Desktop mouse handling functions
let mouseState = {
    dragging: false,
    lastX: 0,
    lastY: 0
}
// Helper functions
function normaliseZoom(z) {
    return Math.min(Math.max(MIN_ZOOM, z), MAX_ZOOM)
}

export function setZoomAt(clientX, clientY, newZoom) {
    const rect = canvas.getBoundingClientRect()
    const mouseX = clientX - rect.left
    const mouseY = clientY - rect.top

    // World coordinates under cursor before zoom
    const worldX = (mouseX - camera.x) / camera.zoom
    const worldY = (mouseY - camera.y) / camera.zoom

    // Apply clamped zoom
    camera.zoom = normaliseZoom(newZoom)

    // Reposition so the same world point stays under the cursor
    camera.x = mouseX - worldX * camera.zoom
    camera.y = mouseY - worldY * camera.zoom
}

function targetScreenCoordsFor(worldX, worldY, zoom) {
    return {
        targetX: canvas.width / 2 - worldX * zoom,
        targetY: canvas.height / 2 - worldY * zoom
    }
}

export function initCamera(canvasEl, handleCanvasClickFunction) {
    canvas = canvasEl
    // A bit hacky, will be used in event listeners. 
    handleCanvasClick = handleCanvasClickFunction
    // Native click handling (works on both desktop and mobile)
    canvas.addEventListener('click', (e) => {
        handleCanvasClick(e.clientX, e.clientY)
    })

    // Desktop mouse events
    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mouseleave', handleMouseUp)
    canvas.addEventListener('wheel', handleWheel, { passive: false })

    // Mobile touch events
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false })

    // Mobile swipe prevention
    document.addEventListener('touchmove', preventSwipeNavigation, { passive: false })
}

export function panCamera(deltaX, deltaY) {
    camera.x += deltaX
    camera.y += deltaY
}


export function getDefaultZoom() {
    return window.innerWidth < 600 ? 1.1 : 1.8
}

export function applyCamera(ctx) {
    ctx.save()
    ctx.translate(camera.x, camera.y)
    ctx.scale(camera.zoom, camera.zoom)
}

export function restoreCamera(ctx) {
    ctx.restore()
}

export function resizeCanvas(ctx) {
    if (!canvas) return

    const container = document.getElementById('game-container')
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight
    ctx.setTransform(1, 0, 0, 1, 0, 0)
}

export function calculateCenter(activeNodes) {
    let totalX = 0, totalY = 0
    activeNodes.forEach(node => {
        totalX += node.x
        totalY += node.y
    })
    const centerX = totalX / activeNodes.length
    const centerY = totalY / activeNodes.length
    return { centerX, centerY }
}
export function centerView(activeNodes, offset = 0) {
    if (activeNodes.length === 0) {
        console.error("No nodes available to center view")
        return
    }

    // Reset any ongoing drag state
    camera.dragging = false

    const { centerX, centerY } = calculateCenter(activeNodes)

    const { targetX: x, targetY: y } = targetScreenCoordsFor(centerX, centerY, camera.zoom)
    camera.x = x
    camera.y = y + offset
}

export function getWorldPosition(clientX, clientY) {
    const rect = canvas.getBoundingClientRect()
    const screenX = clientX - rect.left
    const screenY = clientY - rect.top
    return {
        x: (screenX - camera.x) / camera.zoom,
        y: (screenY - camera.y) / camera.zoom
    }
}

export function getScreenPos(worldX, worldY) {
    // Convert world coordinates to screen coordinates
    const screenX = worldX * camera.zoom + camera.x
    const screenY = worldY * camera.zoom + camera.y
    return {
        x: screenX,
        y: screenY
    }
}
function handleMouseDown(e) {
    if (e.button === 0) { // Left click only
        mouseState.dragging = true
        mouseState.lastX = e.clientX
        mouseState.lastY = e.clientY
        canvas.style.cursor = 'grabbing'
    }
}

function handleMouseMove(e) {
    if (mouseState.dragging) {
        panCamera(e.clientX - mouseState.lastX, e.clientY - mouseState.lastY)
        mouseState.lastX = e.clientX
        mouseState.lastY = e.clientY
    }
}

function handleMouseUp(e) {
    if (mouseState.dragging) {
        mouseState.dragging = false
        canvas.style.cursor = 'default'
    }
}

function handleWheel(e) {
    e.preventDefault()
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
    const newZoom = getZoom() * zoomFactor
    setZoomAt(e.clientX, e.clientY, newZoom)
}

// Mobile touch handling functions
function handleTouchStart(e) {
    e.preventDefault()
    const touch = e.touches[0]

    touchState.startX = touch.clientX
    touchState.startY = touch.clientY
    touchState.startTime = Date.now()
    touchState.lastX = touch.clientX
    touchState.lastY = touch.clientY
    touchState.hasMoved = false

    if (e.touches.length === 2) {
        touchState.isPinching = true
        touchState.lastPinchDistance = getPinchDistance(e.touches[0], e.touches[1])
    } else {
        touchState.isPinching = false
    }
}
function handleTouchMove(e) {
    e.preventDefault()
    
    // Check if touch has moved significantly (for tap detection)
    if (!touchState.hasMoved) {
        const touch = e.touches[0]
        const deltaX = Math.abs(touch.clientX - touchState.startX)
        const deltaY = Math.abs(touch.clientY - touchState.startY)
        if (deltaX > 10 || deltaY > 10) {
            touchState.hasMoved = true
        }
    }

    if (e.touches.length === 2 && touchState.isPinching) {
        // Handle pinch zoom
        const currentDistance = getPinchDistance(e.touches[0], e.touches[1])
        const zoomFactor = currentDistance / touchState.lastPinchDistance
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2
        const newZoom = getZoom() * zoomFactor
        setZoomAt(centerX, centerY, newZoom)
        touchState.lastPinchDistance = currentDistance
    } else if (e.touches.length === 1 && !touchState.isPinching) {
        // Handle single finger pan
        const touch = e.touches[0]
        panCamera(touch.clientX - touchState.lastX, touch.clientY - touchState.lastY)
        touchState.lastX = touch.clientX
        touchState.lastY = touch.clientY
    }
}
function handleTouchEnd(e) {
    const wasQuickTap = !touchState.hasMoved && (Date.now() - touchState.startTime) < 500
    
    if (e.touches.length === 0) {
        // All touches ended
        if (wasQuickTap) {
            // Handle tap as click
            const touch = e.changedTouches[0]
            handleCanvasClick(touch.clientX, touch.clientY)
        }
        touchState.isPinching = false
    } else if (e.touches.length === 1 && touchState.isPinching) {
        // Transition from pinch to single finger
        touchState.isPinching = false
        const touch = e.touches[0]
        touchState.lastX = touch.clientX
        touchState.lastY = touch.clientY
    }
}
function getPinchDistance(touch1, touch2) {
    const dx = touch2.clientX - touch1.clientX
    const dy = touch2.clientY - touch1.clientY
    return Math.sqrt(dx * dx + dy * dy)
}
function preventSwipeNavigation(e) {
    if (e.touches.length > 1) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - touchState.startX
    const deltaY = touch.clientY - touchState.startY
    const deltaTime = Date.now() - touchState.startTime

    // Prevent horizontal swipes from left edge (browser back navigation)
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD
    const isFastSwipe = deltaTime < SWIPE_TIME_LIMIT
    const isFromLeftEdge = touchState.startX < EDGE_THRESHOLD

    if (isHorizontalSwipe && (isFastSwipe || isFromLeftEdge)) {
        e.preventDefault()
    }
}

export function cinematicZoom(zoomTarget) {
    const startZoom = camera.zoom
    const targetZoom = zoomTarget
    const duration = 800 // 1 second
    const startTime = Date.now()

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const worldCenterX = (centerX - camera.x) / camera.zoom
    const worldCenterY = (centerY - camera.y) / camera.zoom

    function animateZoom() {
        const progress = Math.min((Date.now() - startTime) / duration, 1)
        camera.zoom = startZoom + (targetZoom - startZoom) * progress
        camera.x = centerX - worldCenterX * camera.zoom
        camera.y = centerY - worldCenterY * camera.zoom

        if (progress < 1) requestAnimationFrame(animateZoom)
    }

    animateZoom()
}


export function cinematicCenterPoint(x, y, targetZoom = 3) {
    if (camera.zoom === targetZoom) {
        // First dezoom, then center and zoom back
        cinematicZoom(getDefaultZoom())
        setTimeout(() => {
            cinematicPanAndZoom(x, y, targetZoom)
        }, 800)
    } else {
        // Direct center and zoom
        cinematicPanAndZoom(x, y, targetZoom)
    }
}

export function cinematicCenterMap(activeNodes, offset = 0) {
    const { centerX, centerY } = calculateCenter(activeNodes)
    cinematicPanAndZoom(centerX, centerY + offset, getDefaultZoom())
}

export function cinematicPanAndZoom(x, y, targetZoom, duration = 800) {
    if (targetZoom === 0) {
        targetZoom = getDefaultZoom()
    }
    const startX = camera.x
    const startY = camera.y
    const startZoom = camera.zoom
    // const duration = 800
    const startTime = Date.now()

    const { targetX, targetY } = targetScreenCoordsFor(x, y, targetZoom)

    function animate() {
        const progress = Math.min((Date.now() - startTime) / duration, 1)
        const easeProgress = 1 - Math.pow(1 - progress, 3) // Ease out cubic

        camera.x = startX + (targetX - startX) * easeProgress
        camera.y = startY + (targetY - startY) * easeProgress
        camera.zoom = startZoom + (targetZoom - startZoom) * easeProgress

        if (progress < 1) requestAnimationFrame(animate)
    }

    animate()
}

export function panAndZoom(x, y, targetZoom) {
    if (targetZoom === 0) {
        targetZoom = getZoom() // Neutral zoom if specified as 0
    }
    const { targetX, targetY } = targetScreenCoordsFor(x, y, targetZoom)
    camera.x = targetX
    camera.y = targetY
    camera.zoom = targetZoom
}

export function getZoom() {
    return camera.zoom
}

// Debugging functions
export function drawCameraInfo(ctx) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.fillText(`Camera: x=${camera.x.toFixed(0)}, y=${camera.y.toFixed(0)}, zoom=${camera.zoom.toFixed(2)}`, 10, 30)
}
