let canvas, ctx // ctx is local to this module

const MAX_ZOOM = 5
const MIN_ZOOM = 0.5
const camera = {
    x: 0,
    y: 0,
    zoom: 1,
    dragging: false,
    lastX: 0,
    lastY: 0,
    lastPinchDistance: 0,
    isPinching: false
}

// Helper functions
function normaliseZoom(z) {
    return Math.min(Math.max(MIN_ZOOM, z), MAX_ZOOM)
}

function setZoomAt(clientX, clientY, newZoom) {
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

export function initCamera(canvasEl) {
    canvas = canvasEl
}

export function setCameraActions() {
    canvas.addEventListener('mousemove', (e) => {
        moveCamera(e)
    })

    canvas.addEventListener('mouseup', () => {
        endDrag()
    })

    canvas.addEventListener('mouseleave', () => {
        endDrag()
    })

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault()
        if (e.touches.length === 2) {
            startPinch(e)
        } else if (e.touches.length === 1) {
            const touch = e.touches[0]
            startDrag(touch)
        }
    }, { passive: false })

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault()
        if (e.touches.length === 2) {
            handlePinch(e)
        } else if (e.touches.length === 1 && !camera.isPinching) {
            const touch = e.touches[0]
            moveCamera(touch)
        }
    }, { passive: false })

    canvas.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
            endDrag()
            endPinch()
        } else if (e.touches.length === 1 && camera.isPinching) {
            endPinch()
            const touch = e.touches[0]
            startDrag(touch)
        }
    })

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault()
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
        setZoomAt(e.clientX, e.clientY, camera.zoom * zoomFactor)
    }, { passive: false })

    // Prevent context menu on right click
    canvas.addEventListener('contextmenu', (e) => e.preventDefault())
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

function moveCamera(e) {
    if (camera.dragging) {
        camera.x += e.clientX - camera.lastX
        camera.y += e.clientY - camera.lastY // e.movementY / camera.zoom
        camera.lastX = e.clientX
        camera.lastY = e.clientY
    }
}

export function startDrag(e) {
    camera.dragging = true
    camera.lastX = e.clientX
    camera.lastY = e.clientY
    canvas.style.cursor = 'grabbing'

}
export function endDrag() {
    camera.dragging = false
    canvas.style.cursor = 'default'
}

function getPinchDistance(e) {
    const touch1 = e.touches[0]
    const touch2 = e.touches[1]
    const dx = touch2.clientX - touch1.clientX
    const dy = touch2.clientY - touch1.clientY
    return Math.sqrt(dx * dx + dy * dy)
}

function getPinchCenter(e) {
    const touch1 = e.touches[0]
    const touch2 = e.touches[1]
    return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
    }
}

function startPinch(e) {
    camera.isPinching = true
    camera.dragging = false
    camera.lastPinchDistance = getPinchDistance(e)
}

function handlePinch(e) {
    if (!camera.isPinching) return

    const currentDistance = getPinchDistance(e)
    const zoomFactor = currentDistance / camera.lastPinchDistance
    const center = getPinchCenter(e)

    setZoomAt(center.x, center.y, camera.zoom * zoomFactor)

    camera.lastPinchDistance = currentDistance
}

function endPinch() {
    camera.isPinching = false
    camera.lastPinchDistance = 0
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

// Debugging functions
export function drawCameraInfo(ctx) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.fillText(`Camera: x=${camera.x.toFixed(0)}, y=${camera.y.toFixed(0)}, zoom=${camera.zoom.toFixed(2)}`, 10, 30)
}
export function drawDebugGrid(ctx) {
    ctx.save()
    // Draw coordinate grid
    const gridSize = 100
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)'
    ctx.lineWidth = 1

    // Draw grid lines
    for (let x = 0; x < 1500; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, 1500)
        ctx.stroke()

        // Add coordinate labels
        ctx.fillStyle = 'rgba(150, 150, 150, 0.7)'
        ctx.font = '12px Arial'
        ctx.fillText(x.toString(), x + 5, 15)
    }

    for (let y = 0; y < 1500; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(1500, y)
        ctx.stroke()

        // Add coordinate labels
        ctx.fillText(y.toString(), 5, y + 15)
    }

    ctx.restore()
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