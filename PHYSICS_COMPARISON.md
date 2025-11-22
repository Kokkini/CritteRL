# Physics Test vs Game Implementation Comparison

## Summary
The physics test works correctly, but the game implementation has several critical issues that prevent it from working properly.

## Critical Issues

### 1. **No Viewport/Coordinate System**
**Physics Test:**
- Uses `Viewport` class with world units (meters)
- Properly scales world coordinates to screen pixels
- Maintains aspect ratio across different screen sizes
- World dimensions: 20m × 15m

**Game:**
- Uses `CanvasRenderer.physicsToScreenY()` which is just `height - y`
- No viewport system
- No world unit scaling
- Direct pixel coordinates in physics world
- **Impact:** Scene won't scale properly on different resolutions, and physics units are inconsistent

### 2. **Ground Positioning Mismatch**
**Physics Test:**
- Ground positioned at `(WORLD_WIDTH / 2, groundThickness / 2)` = `(10, 0.25)`
- Ground center X is at world center
- Ground top surface is at Y=0 (groundLevel)
- Ground width = WORLD_WIDTH (20m)

**Game (`PlanckAdapter.createGround`):**
- Ground positioned at `(0, level - 0.5)` = `(0, -0.5)` when level=0
- Ground center X is at 0 (left edge of world)
- Ground top surface should be at Y=0, but calculation might be off
- Ground width comes from environment config (20m), but rendering treats it as pixels

**Impact:** Ground might not be positioned correctly relative to creature, and X=0 positioning could cause issues

### 3. **Unit System Inconsistency**
**Physics Test:**
- Everything in meters (world units)
- Ball radius: 0.2m (20cm)
- Ground thickness: 0.5m
- Positions: meters

**Game:**
- Creature design positions are in **pixels** (from editor, e.g., x: 291, y: 291.5)
- These pixel values are used directly in physics world
- Bone sizes are likely in pixels too
- Environment config uses meters (width: 20m, height: 10m)
- **Impact:** Massive scale mismatch! Creature bones are ~300 pixels = ~300 meters in physics, while environment is 20m wide. This explains why creatures fall through ground or appear at wrong scale.

### 4. **Rendering Coordinate Conversion**
**Physics Test:**
- Uses `viewport.worldToScreenX()` and `viewport.worldToScreenY()`
- Properly centers world in canvas
- Handles Y-axis flipping correctly

**Game:**
- `CreatureRenderer` uses `renderer.physicsToScreenY(pos.y)` which is `height - y`
- `EnvironmentRenderer` uses same simple conversion
- No centering, no scaling
- **Impact:** If creature is at physics Y=291 (pixels), it renders at screen Y=height-291, which might be off-screen or incorrectly positioned

### 5. **Ground Rendering Issues**
**Physics Test:**
- Ground rendered using viewport conversion
- Ground width and thickness converted from meters to pixels

**Game (`EnvironmentRenderer.renderGround`):**
- Uses `renderer.physicsToScreenY(groundLevel)` for Y position
- But uses `width` directly as pixels: `ctx.fillRect(0, groundY, width, ...)`
- `width` is 20 (meters), but used as 20 pixels!
- **Impact:** Ground is only 20 pixels wide instead of properly scaled

### 6. **Target Rendering Issues**
**Physics Test:**
- Target position converted through viewport

**Game (`EnvironmentRenderer.renderTarget`):**
- Uses `position.x` directly as pixels
- Uses `renderer.physicsToScreenY(position.y)` for Y
- But `position.x` is in meters (10m), while creature positions are in pixels
- **Impact:** Target appears at wrong scale/position relative to creature

### 7. **Creature Design Units**
**From Editor (`CreatureEditor.tsx`):**
- Bone positions are in canvas pixels (e.g., x: 291, y: 291.5)
- Bone sizes are in pixels
- These are saved directly to `CreatureDesign`
- Used directly in physics: `planck.Vec2(bone.position.x, bone.position.y)`

**Impact:** Creature is created at pixel coordinates (291, 291.5) in physics world, which is treated as meters. This is 291 meters, way outside the 20m environment!

## Root Cause

The fundamental issue is **unit system mismatch**:
1. Creature designs are created in **pixels** (from canvas editor)
2. These pixel values are used directly in **physics world** (which expects meters)
3. Environment config uses **meters** (20m width, 10m height)
4. Rendering uses simple pixel conversion without viewport scaling

## Required Fixes

1. **Implement Viewport System in Game**
   - Use `Viewport` class in `TrainingView` and rendering
   - Define consistent world dimensions (e.g., 20m × 15m)
   - Convert all rendering through viewport

2. **Convert Creature Design Units**
   - Convert creature design positions from pixels to meters
   - Either: Convert at design time (editor saves in meters)
   - Or: Convert at physics creation time (convert pixels to meters when creating bodies)
   - Bone sizes also need conversion

3. **Fix Ground Positioning**
   - Ground center X should be at world center (WORLD_WIDTH / 2)
   - Ground top surface should be at groundLevel (0)
   - Ground width should be in meters, converted through viewport for rendering

4. **Fix Environment Rendering**
   - All environment elements (ground, target, boundaries) should use viewport conversion
   - Width/height should be in meters, converted to pixels via viewport

5. **Consistent Coordinate System**
   - Everything in physics world should be in meters
   - Everything in rendering should go through viewport
   - Editor should either work in meters or convert to meters on save

## Priority

**Critical (Blocks Functionality):**
- Unit system mismatch (creature pixels vs physics meters)
- Ground positioning and rendering
- Viewport system implementation

**High (Affects Quality):**
- Target rendering position
- Environment boundary rendering
- Screen resolution scaling

**Medium (Nice to Have):**
- Editor unit conversion
- Better coordinate system documentation

