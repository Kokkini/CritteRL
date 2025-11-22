# Quickstart Guide: Base Game - CritteRL

**Date**: 2025-01-27  
**Feature**: Base Game Implementation

## Getting Started

This guide provides step-by-step instructions for testing the base game functionality.

## Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Local development server running (Vite dev server)
- Game accessible at `http://localhost:5173` (or configured port)

## Test Scenarios

### Scenario 1: Create and Save a Creature

**Goal**: Verify creature creation and persistence functionality.

**Steps**:
1. Open the game in browser
2. Click "Create New Creature" button
3. Verify empty canvas appears with editor tools
4. Place a bone on the canvas:
   - Click "Add Bone" tool
   - Click on canvas at position (100, 100)
   - Verify bone appears at clicked location
5. Place a second bone:
   - Click "Add Bone" tool
   - Click on canvas at position (200, 100)
   - Verify second bone appears
6. Connect bones with a joint:
   - Click "Add Joint" tool
   - Click on first bone, then second bone
   - Verify joint appears connecting the two bones
7. Add a muscle:
   - Click "Add Muscle" tool
   - Click on first bone, then second bone
   - Verify muscle appears between the bones
8. Save the creature:
   - Enter name "Test Creature 1"
   - Click "Save Creature"
   - Verify success message appears
9. Verify creature is saved:
   - Navigate away from editor
   - Return to creature list
   - Verify "Test Creature 1" appears in list

**Expected Results**:
- ✅ Creature design saves successfully
- ✅ Creature appears in saved creatures list
- ✅ No errors in browser console

---

### Scenario 2: Load a Saved Creature

**Goal**: Verify creature loading functionality.

**Steps**:
1. From creature list, click on "Test Creature 1"
2. Verify creature loads in editor:
   - Two bones visible at correct positions
   - Joint connecting the bones visible
   - Muscle between bones visible
3. Verify creature matches saved design:
   - Bone positions are correct
   - Joint connections are correct
   - Muscle attachments are correct

**Expected Results**:
- ✅ Creature loads successfully
- ✅ All components (bones, joints, muscles) appear correctly
- ✅ No data loss during save/load cycle

---

### Scenario 3: Start Training Session

**Goal**: Verify RL training can be started and runs without errors.

**Steps**:
1. Load "Test Creature 1" from saved creatures
2. Click "Start Training" button
3. Select "Reach Target" task
4. Verify training session starts:
   - Training view appears
   - Creature appears in environment
   - Target waypoint visible
   - Episode counter shows "Episode 1"
5. Observe training for 5-10 episodes:
   - Creature attempts to move
   - Episode counter increments
   - Metrics update (average reward, completion rate)
6. Verify UI remains responsive:
   - No freezing or lag
   - Smooth animation (60fps)
   - Metrics update in real-time

**Expected Results**:
- ✅ Training session starts successfully
- ✅ Creature attempts task (moves toward target)
- ✅ Episodes complete and new ones begin
- ✅ UI remains responsive (no freezing)
- ✅ Metrics update correctly

---

### Scenario 4: Pause and Resume Training

**Goal**: Verify training can be paused and resumed.

**Steps**:
1. Start training session (from Scenario 3)
2. Let training run for 3-5 episodes
3. Click "Pause Training" button
4. Verify training pauses:
   - Creature stops moving
   - Episode counter stops incrementing
   - "Pause" button changes to "Resume"
5. Click "Resume Training" button
6. Verify training resumes:
   - Creature starts moving again
   - Episode counter continues
   - Metrics continue updating

**Expected Results**:
- ✅ Training pauses successfully
- ✅ Training resumes successfully
- ✅ No data loss during pause/resume
- ✅ Training continues from where it paused

---

### Scenario 5: Save Trained Model

**Goal**: Verify trained models can be saved and loaded.

**Steps**:
1. Start training session (from Scenario 3)
2. Let training run for at least 10 episodes
3. Click "Stop Training" button
4. Click "Save Model" button
5. Enter model name "Test Model 1"
6. Verify model saves:
   - Success message appears
   - Model appears in trained models list
7. Load the model:
   - Navigate to trained models list
   - Click on "Test Model 1"
   - Verify model details display (episodes, performance metrics)

**Expected Results**:
- ✅ Trained model saves successfully
- ✅ Model appears in saved models list
- ✅ Model can be loaded and viewed
- ✅ Performance metrics are preserved

---

### Scenario 6: Test Creature with Trained Model

**Goal**: Verify trained creatures can be tested on tasks.

**Steps**:
1. Load "Test Creature 1" and "Test Model 1"
2. Click "Test Creature" button
3. Select "Reach Target" task
4. Verify test runs:
   - Creature appears in environment
   - Creature attempts to reach target using trained model
   - Test completes (success or failure)
5. Verify results display:
   - Performance score visible
   - Distance to target shown
   - Completion status (success/failure)
   - Time to complete (if successful)

**Expected Results**:
- ✅ Test runs successfully
- ✅ Creature uses trained model behavior
- ✅ Results display correctly
- ✅ Performance metrics are accurate

---

### Scenario 7: Storage Quota Warning

**Goal**: Verify storage quota warnings appear when approaching limit.

**Steps**:
1. Create and save multiple creatures (10+ creatures)
2. Train and save multiple models (5+ models)
3. Monitor storage usage:
   - Check storage usage indicator
   - Verify percentage displayed
4. When storage reaches 80%:
   - Verify warning message appears
   - Warning suggests deleting old creatures/models
5. Test quota exceeded scenario (if possible):
   - Continue saving until quota exceeded
   - Verify error message appears
   - Verify save fails gracefully

**Expected Results**:
- ✅ Storage usage is tracked correctly
- ✅ Warning appears at 80% capacity
- ✅ Error message appears when quota exceeded
- ✅ User can delete items to free space

---

### Scenario 8: Offline Functionality

**Goal**: Verify game works offline after initial load.

**Steps**:
1. Load game in browser (with internet)
2. Wait for game to fully load
3. Disable network connection (airplane mode or network disconnect)
4. Verify game still works:
   - Create a new creature
   - Save creature (should work - uses browser storage)
   - Load saved creature (should work)
   - Start training (should work - no external API calls)

**Expected Results**:
- ✅ Game works entirely offline
- ✅ No network errors appear
- ✅ All functionality accessible (create, save, load, train)

---

### Scenario 9: Performance Validation

**Goal**: Verify performance targets are met.

**Steps**:
1. Open browser developer tools
2. Enable FPS counter (if available)
3. Create a creature with 10 bones
4. Start training session
5. Monitor performance:
   - Check FPS (should be ~60fps)
   - Check memory usage (should be stable)
   - Check CPU usage (should be reasonable)
6. Let training run for 50+ episodes
7. Verify no performance degradation:
   - FPS remains stable
   - Memory doesn't leak
   - No browser crashes

**Expected Results**:
- ✅ FPS maintains ~60fps during training
- ✅ Memory usage is stable (no leaks)
- ✅ Training runs for 100+ episodes without issues
- ✅ No browser crashes or freezes

---

### Scenario 10: Error Handling

**Goal**: Verify error handling for edge cases.

**Steps**:
1. **Invalid creature design**:
   - Try to save creature with no bones
   - Verify validation error appears
2. **Corrupted data**:
   - Manually corrupt localStorage data
   - Try to load creature
   - Verify error message appears
   - Verify user can still create new creatures
3. **Training interruption**:
   - Start training
   - Close browser tab immediately
   - Reopen game
   - Verify training can be resumed (if checkpoint saved)
4. **Physics instability**:
   - Create creature with extreme joint angles
   - Start training
   - Verify instability is detected and handled

**Expected Results**:
- ✅ Validation errors display clearly
- ✅ Corrupted data handled gracefully
- ✅ Training can be resumed after interruption
- ✅ Physics instability detected and handled

---

## Performance Benchmarks

### Expected Performance Metrics

- **Page Load**: < 3 seconds on 3G connection
- **FPS**: 60fps during training (creatures up to 10 bones)
- **UI Responsiveness**: < 100ms freeze during training computation
- **Memory**: Stable memory usage for 100+ training episodes
- **Storage**: Efficient storage usage (models compressed if possible)

### How to Measure

1. **Page Load Time**:
   - Open browser DevTools → Network tab
   - Throttle to "Slow 3G"
   - Reload page
   - Measure time to interactive

2. **FPS**:
   - Use browser FPS counter or Performance API
   - Monitor during training session
   - Should maintain ~60fps

3. **UI Freeze**:
   - Use Performance API to measure main thread blocking
   - Training computation should not block > 100ms

4. **Memory**:
   - Use browser DevTools → Memory tab
   - Take heap snapshots before and after training
   - Verify no memory leaks

---

## Troubleshooting

### Common Issues

1. **Training doesn't start**:
   - Check browser console for errors
   - Verify creature has at least one muscle
   - Verify MimicRL library loaded correctly

2. **Low FPS**:
   - Reduce creature complexity (fewer bones)
   - Check if Web Workers are being used for training
   - Verify physics timestep is optimized

3. **Storage errors**:
   - Check browser storage quota
   - Delete old creatures/models to free space
   - Verify IndexedDB is available in browser

4. **Training freezes UI**:
   - Verify Web Workers are enabled
   - Check if training computation is on main thread
   - Reduce batch size or episode length

---

## Success Criteria Validation

Use these scenarios to validate success criteria from the specification:

- **SC-001**: Scenario 1 (create creature in < 2 minutes) ✓
- **SC-002**: Scenarios 1, 2 (save/load 100% success) ✓
- **SC-003**: Scenario 9 (60fps for 10 bones) ✓
- **SC-004**: Scenario 9 (100+ episodes without crashes) ✓
- **SC-005**: Scenario 3 (improvement over training) ✓
- **SC-006**: Scenario 9 (page load < 3s) ✓
- **SC-007**: Scenario 9 (UI freeze < 100ms) ✓
- **SC-008**: Scenario 6 (test creatures 100% success) ✓
- **SC-009**: Scenario 8 (offline functionality) ✓
- **SC-010**: Scenarios 1, 2, 5 (persistence across sessions) ✓

