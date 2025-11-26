/**
 * CreatureEditor - Visual editor for creating and editing creature designs
 */

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreatureDesign } from '../../utils/types';
import { CreatureDesignImpl } from '../../utils/CreatureDesign';
import { BoneImpl } from '../../utils/Bone';
import { JointImpl } from '../../utils/Joint';
import { MuscleImpl } from '../../utils/Muscle';
import { CreatureService } from '../../services/CreatureService';
import { StorageService } from '../../services/StorageService';
import { nanoid } from 'nanoid';
import { ValidationResult } from '../../utils/types';
import { Viewport } from '../../rendering/Viewport';
import { GameConstants } from '../../utils/constants';
import { generateRandomName } from '../../utils/nameGenerator';

export interface CreatureEditorProps {
  initialCreatureId?: string;
  onSave?: (creature: CreatureDesign) => void;
  onCancel?: () => void;
}

export interface CreatureEditorRef {
  getCreature(): CreatureDesign;
  validate(): ValidationResult;
  reset(): void;
}

const CreatureEditor = forwardRef<CreatureEditorRef, CreatureEditorProps>(
  ({ initialCreatureId, onSave, onCancel }, ref) => {
    const navigate = useNavigate();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [creature, setCreature] = useState<CreatureDesignImpl>(
      new CreatureDesignImpl(generateRandomName())
    );
    // Store joint positions (joints placed as circles before bones are created)
    // Map: jointId -> position
    const [jointPositions, setJointPositions] = useState<Map<string, { x: number; y: number }>>(
      new Map()
    );
    // Store which joint positions each bone connects to
    // Map: boneId -> [jointId1, jointId2]
    const [boneToJoints, setBoneToJoints] = useState<Map<string, [string, string]>>(new Map());
    const [selectedJointId, setSelectedJointId] = useState<string | null>(null);
    const [selectedBoneId, setSelectedBoneId] = useState<string | null>(null);
    const [mode, setMode] = useState<'joint' | 'bone' | 'muscle'>('joint');
    const [loading, setLoading] = useState(false);

    const storageServiceRef = useRef<StorageService | null>(null);
    const creatureServiceRef = useRef<CreatureService | null>(null);
    const viewportRef = useRef<Viewport | null>(null);

    useEffect(() => {
      const init = async () => {
        const storage = new StorageService();
        await storage.initialize();
        storageServiceRef.current = storage;
        creatureServiceRef.current = new CreatureService(storage);

        if (initialCreatureId) {
          const loaded = await creatureServiceRef.current.loadCreature(initialCreatureId);
          if (loaded) {
            const design = new CreatureDesignImpl(loaded.name);
            design.id = loaded.id;
            design.createdAt = loaded.createdAt;
            design.updatedAt = loaded.updatedAt;
            design.bones = loaded.bones;
            design.joints = loaded.joints;
            design.muscles = loaded.muscles;
            setCreature(design);
            
            // Reconstruct joint positions from existing bones and joints
            // Extract unique joint positions from bone endpoints
            const positions = new Map<string, { x: number; y: number }>();
            const boneMapping = new Map<string, [string, string]>();
            
            // For each bone, find its endpoints from joints
            loaded.bones.forEach((bone) => {
              const connectedJoints = loaded.joints.filter(
                (j) => j.boneAId === bone.id || j.boneBId === bone.id
              );
              if (connectedJoints.length >= 2) {
                // This bone connects two joints
                const joint1 = connectedJoints[0];
                const joint2 = connectedJoints[1];
                const pos1 = {
                  x: bone.position.x + (joint1.boneAId === bone.id ? joint1.anchorA.x : joint1.anchorB.x),
                  y: bone.position.y + (joint1.boneAId === bone.id ? joint1.anchorA.y : joint1.anchorB.y),
                };
                const pos2 = {
                  x: bone.position.x + (joint2.boneAId === bone.id ? joint2.anchorA.x : joint2.anchorB.x),
                  y: bone.position.y + (joint2.boneAId === bone.id ? joint2.anchorA.y : joint2.anchorB.y),
                };
                
                // Create joint position IDs or reuse existing ones
                const joint1Id = joint1.id + '_pos1';
                const joint2Id = joint2.id + '_pos2';
                positions.set(joint1Id, pos1);
                positions.set(joint2Id, pos2);
                boneMapping.set(bone.id, [joint1Id, joint2Id]);
              }
            });
            
            setJointPositions(positions);
            setBoneToJoints(boneMapping);
          }
        }
      };
      init();
    }, [initialCreatureId]);

    // Initialize viewport and canvas
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Set canvas size to match world aspect ratio (20m × 15m = 4:3)
      const updateCanvasSize = () => {
        const container = canvas.parentElement;
        const worldAspectRatio = GameConstants.EDITOR_VIEWPORT_WIDTH / GameConstants.EDITOR_VIEWPORT_HEIGHT; // 4/3
        
        let canvasWidth: number;
        let canvasHeight: number;
        
        if (container) {
          const rect = container.getBoundingClientRect();
          const containerWidth = rect.width || 800;
          const containerHeight = rect.height || 600;
          const containerAspectRatio = containerWidth / containerHeight;
          
          // Fit canvas to container while maintaining world aspect ratio
          if (containerAspectRatio > worldAspectRatio) {
            // Container is wider - fit to height
            canvasHeight = containerHeight;
            canvasWidth = canvasHeight * worldAspectRatio;
          } else {
            // Container is taller - fit to width
            canvasWidth = containerWidth;
            canvasHeight = canvasWidth / worldAspectRatio;
          }
        } else {
          // Fallback: use world aspect ratio with reasonable size
          canvasWidth = 800;
          canvasHeight = canvasWidth / worldAspectRatio; // 600
        }
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        // Update viewport if it exists
        if (viewportRef.current) {
          viewportRef.current.resize(canvas.width, canvas.height);
        } else {
          // Create viewport for coordinate transformation (editor uses smaller viewport)
          const viewport = new Viewport(
            canvas.width,
            canvas.height,
            GameConstants.EDITOR_VIEWPORT_WIDTH,
            GameConstants.EDITOR_VIEWPORT_HEIGHT
          );
          viewportRef.current = viewport;
          console.log(`[CreatureEditor] Viewport created: ${viewport.getPixelsPerMeter().toFixed(2)} pixels/meter`);
        }
      };
      
      updateCanvasSize();
      
      // Handle window resize
      window.addEventListener('resize', updateCanvasSize);
      return () => window.removeEventListener('resize', updateCanvasSize);
    }, []);

    useImperativeHandle(ref, () => ({
      getCreature: () => creature,
      validate: () => creature.validate(),
      reset: () => setCreature(new CreatureDesignImpl('New Creature')),
    }));

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !viewportRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      
      // Convert screen coordinates to world coordinates (meters)
      const viewport = viewportRef.current;
      const worldX = viewport.screenToWorldX(screenX);
      const worldY = viewport.screenToWorldY(screenY);
      
      // Store positions in meters (not editor pixels)
      const x = worldX;  // Meters
      const y = worldY;  // Meters

      if (mode === 'joint') {
        // Place a joint (circle) at click position
        const jointId = nanoid();
        const newPositions = new Map(jointPositions);
        newPositions.set(jointId, { x, y });
        setJointPositions(newPositions);
        setSelectedJointId(null);
      } else if (mode === 'bone' && selectedJointId) {
        // Create bone by connecting selected joint to clicked joint
        // Use tolerance in meters (0.15m = 15cm), positions are in meters
        const clickToleranceMeters = 0.15;
        const clickedJointId = Array.from(jointPositions.entries()).find(
          ([, pos]) => Math.abs(pos.x - x) < clickToleranceMeters && Math.abs(pos.y - y) < clickToleranceMeters
        )?.[0];

        if (clickedJointId && clickedJointId !== selectedJointId) {
          const pos1 = jointPositions.get(selectedJointId);
          const pos2 = jointPositions.get(clickedJointId);
          if (pos1 && pos2) {
            // Create bone positioned between the two joints
            const midX = (pos1.x + pos2.x) / 2;
            const midY = (pos1.y + pos2.y) / 2;
            const distance = Math.sqrt(
              Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2)
            );
            
            // Angle: atan2 gives angle from pos1 to pos2
            // Joint positions are already in world coordinates (physics, Y-up)
            // So we calculate angle directly without flipping Y
            const dx = pos2.x - pos1.x;
            const dy = pos2.y - pos1.y;
            // Angle in physics coordinates (Y-up)
            const angle = Math.atan2(dy, dx);

            // Create bone with reasonable size (all in meters)
            // Bone width (length along bone) = distance between joints (in meters)
            // Bone height (thickness perpendicular to bone) = fixed reasonable size
            const boneThicknessMeters = GameConstants.DEFAULT_BONE_THICKNESS;
            const boneId = nanoid();
            const bone = new BoneImpl(
              boneId,
              { x: midX, y: midY },  // Position in meters
              { width: distance, height: boneThicknessMeters }, // Size in meters
              angle,
              GameConstants.DEFAULT_BONE_DENSITY
            );
            
            // Calculate joint anchor positions in bone's LOCAL coordinate system
            // In local coords: bone extends from -distance/2 to +distance/2 along X axis
            // Joints are at the endpoints: pos1 at -distance/2, pos2 at +distance/2
            // We need to determine which joint is at which endpoint
            const halfDistance = distance / 2;
            
            // Transform joint positions to bone's local space to determine endpoints
            // Vector from bone center to pos1
            const vec1X = pos1.x - midX;
            const vec1Y = pos1.y - midY;
            // Vector from bone center to pos2  
            const vec2X = pos2.x - midX;
            const vec2Y = pos2.y - midY;
            
            // Rotate vectors to bone's local space (inverse rotation)
            // Note: angle is already in physics coordinates (Y up), so we use it directly
            const cos = Math.cos(-angle);
            const sin = Math.sin(-angle);
            const localVec1X = vec1X * cos - vec1Y * sin;
            const localVec2X = vec2X * cos - vec2Y * sin;
            
            // Determine which joint is at which endpoint based on local X coordinate
            // Joint with negative local X is at -distance/2, positive is at +distance/2
            // Store anchors in local coordinates (relative to bone center, before rotation)
            // Y is 0 because joints are along the bone's length axis
            const anchor1Local = localVec1X < 0 
              ? { x: -halfDistance, y: 0 }  // pos1 is at left endpoint
              : { x: halfDistance, y: 0 };   // pos1 is at right endpoint
            const anchor2Local = localVec2X < 0
              ? { x: -halfDistance, y: 0 }  // pos2 is at left endpoint
              : { x: halfDistance, y: 0 };   // pos2 is at right endpoint

            // Find or create bones at the joint positions
            // If bones already exist at these joint positions, connect them
            // Otherwise, we'll need to create placeholder bones or handle it differently
            // For now, we'll create the bone and store which joint positions it connects
            // The actual joint connections will be created when bones share joint positions

            const newCreature = new CreatureDesignImpl(creature.name);
            newCreature.id = creature.id;
            newCreature.createdAt = creature.createdAt;
            newCreature.updatedAt = new Date();
            newCreature.bones = [...creature.bones, bone];
            
            // Check if there are existing bones that should be connected at these joint positions
            // Find bones that connect to the same joint positions
            const newJoints = [...creature.joints];
            
            // Find bones that connect to the selected joint positions
            boneToJoints.forEach((jointIds, existingBoneId) => {
              const [jointId1, jointId2] = jointIds;
              const existingBone = creature.bones.find((b) => b.id === existingBoneId);
              if (!existingBone) return;
              
              // Check if existing bone shares a joint position with the new bone
              if (jointId1 === selectedJointId || jointId1 === clickedJointId) {
                // Create joint connecting existing bone and new bone at this joint position
                const sharedPos = jointPositions.get(jointId1);
                if (sharedPos) {
                  // Calculate which endpoint of the existing bone this joint connects to
                  // Transform shared position to existing bone's local space
                  const existingVecX = sharedPos.x - existingBone.position.x;
                  const existingVecY = sharedPos.y - existingBone.position.y;
                  const existingCos = Math.cos(-existingBone.angle);
                  const existingSin = Math.sin(-existingBone.angle);
                  const existingLocalX = existingVecX * existingCos - existingVecY * existingSin;
                  
                  // Anchors should be at bone endpoints in local coordinates
                  // Bone extends from -width/2 to +width/2 along X axis
                  const existingHalfWidth = existingBone.size.width / 2;
                  const existingAnchorLocal = existingLocalX < 0
                    ? { x: -existingHalfWidth, y: 0 }  // Left endpoint
                    : { x: existingHalfWidth, y: 0 };   // Right endpoint
                  
                  // Determine which anchor to use for new bone based on which joint position
                  const newAnchorLocal = (jointId1 === selectedJointId) ? anchor1Local : anchor2Local;
                  
                  const joint = new JointImpl(
                    nanoid(),
                    existingBoneId,
                    boneId,
                    existingAnchorLocal, // Local coords for existing bone (at endpoint)
                    newAnchorLocal, // Local coords for new bone (at endpoint)
                    null,
                    null,
                    false
                  );
                  newJoints.push(joint);
                  console.log(`[CreatureEditor] Created joint: existing anchor (${existingAnchorLocal.x.toFixed(2)}, ${existingAnchorLocal.y.toFixed(2)}), new anchor (${newAnchorLocal.x.toFixed(2)}, ${newAnchorLocal.y.toFixed(2)})`);
                }
              }
              if (jointId2 === selectedJointId || jointId2 === clickedJointId) {
                // Create joint connecting existing bone and new bone at this joint position
                const sharedPos = jointPositions.get(jointId2);
                if (sharedPos) {
                  // Calculate which endpoint of the existing bone this joint connects to
                  // Transform shared position to existing bone's local space
                  const existingVecX = sharedPos.x - existingBone.position.x;
                  const existingVecY = sharedPos.y - existingBone.position.y;
                  const existingCos = Math.cos(-existingBone.angle);
                  const existingSin = Math.sin(-existingBone.angle);
                  const existingLocalX = existingVecX * existingCos - existingVecY * existingSin;
                  
                  // Anchors should be at bone endpoints in local coordinates
                  // Bone extends from -width/2 to +width/2 along X axis
                  const existingHalfWidth = existingBone.size.width / 2;
                  const existingAnchorLocal = existingLocalX < 0
                    ? { x: -existingHalfWidth, y: 0 }  // Left endpoint
                    : { x: existingHalfWidth, y: 0 };   // Right endpoint
                  
                  // Determine which anchor to use for new bone
                  const newAnchorLocal = (jointId2 === selectedJointId) ? anchor1Local : anchor2Local;
                  
                  const joint = new JointImpl(
                    nanoid(),
                    existingBoneId,
                    boneId,
                    existingAnchorLocal, // Local coords for existing bone (at endpoint)
                    newAnchorLocal, // Local coords for new bone (at endpoint)
                    null,
                    null,
                    false
                  );
                  newJoints.push(joint);
                  console.log(`[CreatureEditor] Created joint: existing anchor (${existingAnchorLocal.x.toFixed(2)}, ${existingAnchorLocal.y.toFixed(2)}), new anchor (${newAnchorLocal.x.toFixed(2)}, ${newAnchorLocal.y.toFixed(2)})`);
                }
              }
            });

            newCreature.joints = newJoints;
            newCreature.muscles = creature.muscles;
            setCreature(newCreature);
            
            // Store which joint positions this bone connects
            const newBoneToJoints = new Map(boneToJoints);
            newBoneToJoints.set(boneId, [selectedJointId, clickedJointId]);
            setBoneToJoints(newBoneToJoints);
            
            setSelectedJointId(null);
          }
        } else {
          // Select joint for bone creation
          // Use tolerance in meters (0.15m = 15cm), positions are in meters
          const clickToleranceMeters = 0.15;
          const clickedJointId = Array.from(jointPositions.entries()).find(
            ([, pos]) => Math.abs(pos.x - x) < clickToleranceMeters && Math.abs(pos.y - y) < clickToleranceMeters
          )?.[0];
          if (clickedJointId) {
            setSelectedJointId(clickedJointId);
          }
        }
      } else if (mode === 'bone') {
        // Select first joint for bone creation
        // Use tolerance in meters (0.15m = 15cm), positions are in meters
        const clickToleranceMeters = 0.15;
        const clickedJointId = Array.from(jointPositions.entries()).find(
          ([, pos]) => Math.abs(pos.x - x) < clickToleranceMeters && Math.abs(pos.y - y) < clickToleranceMeters
        )?.[0];
        if (clickedJointId) {
          setSelectedJointId(clickedJointId);
        }
      } else if (mode === 'muscle' && selectedBoneId) {
        // Attach muscle from selected bone to clicked bone
        // Check if click is within any bone's rectangular bounds
        // All coordinates are now in meters
        console.log(`[CreatureEditor] Second bone click at world coords (${x.toFixed(3)}, ${y.toFixed(3)}) meters, selected bone: ${selectedBoneId}`);
        const clickedBone = creature.bones.find((b) => {
          // Bone positions and sizes are already in meters
          const boneWorldX = b.position.x;
          const boneWorldY = b.position.y;
          const boneWidthWorld = b.size.width; // length along bone (meters)
          const boneHeightWorld = b.size.height; // thickness (meters)
          
          // Click position is already in meters
          const clickWorldX = x;
          const clickWorldY = y;
          
          // Check if click is within bone's rotated rectangle
          // Transform click point to bone's local coordinate system
          const dx = clickWorldX - boneWorldX;
          const dy = clickWorldY - boneWorldY;
          
          // Rotate point to bone's local space (inverse of bone angle)
          // The bone angle is stored in physics coordinates, so we use it directly
          const cos = Math.cos(-b.angle);
          const sin = Math.sin(-b.angle);
          const localX = dx * cos - dy * sin;
          const localY = dx * sin + dy * cos;
          
          // Check if point is within bone's rectangle (with tolerance)
          // Bones are very thin (0.2m), so we need a reasonable tolerance for clicking
          const tolerance = 0.3; // 0.3m tolerance - more forgiving for thin bones
          const halfWidth = boneWidthWorld / 2 + tolerance;
          const halfHeight = boneHeightWorld / 2 + tolerance;
          
          const isInside = Math.abs(localX) < halfWidth && Math.abs(localY) < halfHeight;
          console.log(`[CreatureEditor] Bone ${b.id}: world=(${boneWorldX.toFixed(3)}, ${boneWorldY.toFixed(3)}), click=(${clickWorldX.toFixed(3)}, ${clickWorldY.toFixed(3)}), local=(${localX.toFixed(3)}, ${localY.toFixed(3)}), bounds=(${halfWidth.toFixed(3)}, ${halfHeight.toFixed(3)}), inside=${isInside}`);
          return isInside;
        });
        
        if (clickedBone && clickedBone.id !== selectedBoneId) {
          const boneA = creature.bones.find((b) => b.id === selectedBoneId);
          const boneB = clickedBone;
          if (boneA && boneB) {
            // Calculate distance in meters (positions are already in meters)
            const distanceMeters = Math.sqrt(
              Math.pow(boneB.position.x - boneA.position.x, 2) +
                Math.pow(boneB.position.y - boneA.position.y, 2)
            );
            // restLength is stored in meters
            const muscle = new MuscleImpl(
              nanoid(),
              selectedBoneId,
              clickedBone.id,
              GameConstants.DEFAULT_MUSCLE_MAX_FORCE,
              distanceMeters
            );
            const newCreature = new CreatureDesignImpl(creature.name);
            newCreature.id = creature.id;
            newCreature.createdAt = creature.createdAt;
            newCreature.updatedAt = new Date();
            newCreature.bones = creature.bones;
            newCreature.joints = creature.joints;
            newCreature.muscles = [...creature.muscles, muscle];
            setCreature(newCreature);
            setSelectedBoneId(null);
            console.log(`[CreatureEditor] Created muscle between ${selectedBoneId} and ${clickedBone.id}`);
          }
        } else if (clickedBone && clickedBone.id === selectedBoneId) {
          console.log(`[CreatureEditor] Clicked the same bone, ignoring`);
        } else {
          console.log(`[CreatureEditor] No bone found at click position (${x.toFixed(1)}, ${y.toFixed(1)})`);
        }
      } else if (mode === 'muscle') {
        // Select first bone for muscle attachment
        // All coordinates are now in meters
        console.log(`[CreatureEditor] Checking click at world coords (${x.toFixed(3)}, ${y.toFixed(3)}) meters against ${creature.bones.length} bones`);
        const clickedBone = creature.bones.find((b) => {
          // Bone positions and sizes are already in meters
          const boneWorldX = b.position.x;
          const boneWorldY = b.position.y;
          const boneWidthWorld = b.size.width; // length along bone (meters)
          const boneHeightWorld = b.size.height; // thickness (meters)
          
          // Click position is already in meters
          const clickWorldX = x;
          const clickWorldY = y;
          
          // Check if click is within bone's rotated rectangle
          // Transform click point to bone's local coordinate system
          const dx = clickWorldX - boneWorldX;
          const dy = clickWorldY - boneWorldY;
          
          // Rotate point to bone's local space (inverse of bone angle)
          // The bone angle is stored in physics coordinates, so we use it directly
          const cos = Math.cos(-b.angle);
          const sin = Math.sin(-b.angle);
          const localX = dx * cos - dy * sin;
          const localY = dx * sin + dy * cos;
          
          // Check if point is within bone's rectangle (with tolerance)
          // Bones are very thin (0.2m), so we need a reasonable tolerance for clicking
          const tolerance = 0.3; // 0.3m tolerance - more forgiving for thin bones
          const halfWidth = boneWidthWorld / 2 + tolerance;
          const halfHeight = boneHeightWorld / 2 + tolerance;
          
          const isInside = Math.abs(localX) < halfWidth && Math.abs(localY) < halfHeight;
          console.log(`[CreatureEditor] Bone ${b.id}: world=(${boneWorldX.toFixed(3)}, ${boneWorldY.toFixed(3)}), click=(${clickWorldX.toFixed(3)}, ${clickWorldY.toFixed(3)}), local=(${localX.toFixed(3)}, ${localY.toFixed(3)}), bounds=(${halfWidth.toFixed(3)}, ${halfHeight.toFixed(3)}), inside=${isInside}`);
          return isInside;
        });
        if (clickedBone) {
          setSelectedBoneId(clickedBone.id);
          console.log(`[CreatureEditor] Selected bone ${clickedBone.id} for muscle attachment`);
        } else {
          console.log(`[CreatureEditor] No bone found at click position (${x.toFixed(1)}, ${y.toFixed(1)})`);
        }
      }
    };

    const handleSave = async () => {
      if (!creatureServiceRef.current) return;

      setLoading(true);
      try {
        // Ensure all bones have corresponding joints if they connect joint positions
        // This is handled automatically when bones are created
        
        const validation = creature.validate();
        if (!validation.valid) {
          alert('Invalid creature: ' + validation.errors.join(', '));
          return;
        }

        await creatureServiceRef.current.saveCreature(creature);
        if (onSave) {
          onSave(creature);
        } else {
          navigate('/');
        }
      } catch (error) {
        alert('Failed to save: ' + (error instanceof Error ? error.message : String(error)));
      } finally {
        setLoading(false);
      }
    };

    const handleCancel = () => {
      if (onCancel) {
        onCancel();
      } else {
        navigate('/');
      }
    };

    // Render canvas
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !viewportRef.current) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const viewport = viewportRef.current;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid to show world bounds
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      const gridSpacingM = 1; // 1 meter grid
      const viewportWidth = GameConstants.EDITOR_VIEWPORT_WIDTH;
      const viewportHeight = GameConstants.EDITOR_VIEWPORT_HEIGHT;
      for (let x = 0; x <= viewportWidth; x += gridSpacingM) {
        const screenX = viewport.worldToScreenX(x);
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= viewportHeight; y += gridSpacingM) {
        const screenY = viewport.worldToScreenY(y);
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(canvas.width, screenY);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      
      // Draw world bounds
      ctx.strokeStyle = '#CCCCCC';
      ctx.lineWidth = 2;
      const leftX = viewport.worldToScreenX(0);
      const rightX = viewport.worldToScreenX(viewportWidth);
      const bottomY = viewport.worldToScreenY(0);
      const topY = viewport.worldToScreenY(viewportHeight);
      ctx.strokeRect(leftX, topY, rightX - leftX, bottomY - topY);

      // Draw joint positions (circles) - these are placed first
      // Positions are now in meters, convert directly to screen pixels
      jointPositions.forEach((pos, jointId) => {
        // Positions are already in meters
        const screenX = viewport.worldToScreenX(pos.x);
        const screenY = viewport.worldToScreenY(pos.y);
        const radiusPx = viewport.worldToScreenDistance(0.1); // 10cm radius
        
        ctx.fillStyle = selectedJointId === jointId ? '#4CAF50' : '#9C27B0';
        ctx.beginPath();
        ctx.arc(screenX, screenY, radiusPx, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Draw bones (created by connecting joints)
      // Positions and sizes are now in meters, convert directly to screen pixels
      creature.bones.forEach((bone) => {
        // Positions are already in meters
        const screenX = viewport.worldToScreenX(bone.position.x);
        const screenY = viewport.worldToScreenY(bone.position.y);
        
        // Sizes are already in meters
        const boneWidthPx = viewport.worldToScreenDistance(bone.size.width);
        const boneHeightPx = viewport.worldToScreenDistance(bone.size.height);
        
        // Draw click detection area (only in muscle mode) - matches bone rectangle
        if (mode === 'muscle') {
          const clickToleranceWorld = 0.1; // 0.1m tolerance
          const clickWidthPx = viewport.worldToScreenDistance(bone.size.width + clickToleranceWorld * 2);
          const clickHeightPx = viewport.worldToScreenDistance(bone.size.height + clickToleranceWorld * 2);
          
          ctx.save();
          ctx.translate(screenX, screenY);
          // Negate angle because physics uses Y-up (counterclockwise positive) 
          // while screen uses Y-down (clockwise positive)
          // When viewport flips Y-axis, we also need to flip the rotation direction
          ctx.rotate(-bone.angle);
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = selectedBoneId === bone.id ? '#4CAF50' : '#FFD700';
          ctx.fillRect(-clickWidthPx / 2, -clickHeightPx / 2, clickWidthPx, clickHeightPx);
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = selectedBoneId === bone.id ? '#4CAF50' : '#FFD700';
          ctx.lineWidth = 1;
          ctx.strokeRect(-clickWidthPx / 2, -clickHeightPx / 2, clickWidthPx, clickHeightPx);
          ctx.restore();
        }
        
        ctx.save();
        ctx.translate(screenX, screenY);
        // Negate angle because physics uses Y-up (counterclockwise positive) 
        // while screen uses Y-down (clockwise positive)
        // When viewport flips Y-axis, we also need to flip the rotation direction
        ctx.rotate(-bone.angle);
        ctx.fillStyle = selectedBoneId === bone.id ? '#4CAF50' : '#2196F3';
        ctx.fillRect(-boneWidthPx / 2, -boneHeightPx / 2, boneWidthPx, boneHeightPx);
        ctx.strokeStyle = selectedBoneId === bone.id ? '#2E7D32' : '#1976D2';
        ctx.lineWidth = selectedBoneId === bone.id ? 2 : 1;
        ctx.strokeRect(-boneWidthPx / 2, -boneHeightPx / 2, boneWidthPx, boneHeightPx);
        ctx.restore();
      });

      // Draw muscles
      creature.muscles.forEach((muscle) => {
        const boneA = creature.bones.find((b) => b.id === muscle.boneAId);
        const boneB = creature.bones.find((b) => b.id === muscle.boneBId);
        if (boneA && boneB) {
          // Positions are already in meters
          const screenXA = viewport.worldToScreenX(boneA.position.x);
          const screenYA = viewport.worldToScreenY(boneA.position.y);
          const screenXB = viewport.worldToScreenX(boneB.position.x);
          const screenYB = viewport.worldToScreenY(boneB.position.y);
          
          ctx.strokeStyle = '#FF9800';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(screenXA, screenYA);
          ctx.lineTo(screenXB, screenYB);
          ctx.stroke();
        }
      });

      // Draw actual joints (connections between bones)
      creature.joints.forEach((joint) => {
        const boneA = creature.bones.find((b) => b.id === joint.boneAId);
        if (boneA) {
          // Positions and anchors are already in meters
          // Calculate joint world position: bone position + anchor (in bone's local space, rotated)
          const cos = Math.cos(boneA.angle);
          const sin = Math.sin(boneA.angle);
          // Transform anchor from local to world space
          const anchorWorldX = boneA.position.x + (joint.anchorA.x * cos - joint.anchorA.y * sin);
          const anchorWorldY = boneA.position.y + (joint.anchorA.x * sin + joint.anchorA.y * cos);
          const screenX = viewport.worldToScreenX(anchorWorldX);
          const screenY = viewport.worldToScreenY(anchorWorldY);
          const radiusPx = viewport.worldToScreenDistance(0.05); // 5cm radius
          
          ctx.fillStyle = '#E91E63';
          ctx.beginPath();
          ctx.arc(screenX, screenY, radiusPx, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }, [creature, selectedBoneId, jointPositions, selectedJointId, mode]);

    return (
      <div>
        <div style={{ marginBottom: '20px' }}>
          <button onClick={() => setMode('joint')} disabled={mode === 'joint'}>
            Add Joint
          </button>
          <button onClick={() => setMode('bone')} disabled={mode === 'bone'}>
            Add Bone
          </button>
          <button onClick={() => setMode('muscle')} disabled={mode === 'muscle'}>
            Add Muscle
          </button>
          <button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button onClick={handleCancel}>Cancel</button>
        </div>
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          style={{ border: '1px solid #ccc', cursor: 'crosshair' }}
          onClick={handleCanvasClick}
        />
        <div style={{ marginTop: '10px' }}>
          <p>
            Mode: <strong>{mode}</strong>
          </p>
          <p>
            Joint Positions: {jointPositions.size} | Bones: {creature.bones.length} | Joints: {creature.joints.length} | Muscles:{' '}
            {creature.muscles.length}
          </p>
          {selectedJointId && mode === 'bone' && (
            <p style={{ color: '#4CAF50' }}>Selected joint. Click another joint to create a bone.</p>
          )}
          {selectedBoneId && mode === 'muscle' && (
            <p style={{ color: '#4CAF50' }}>Selected bone. Click another bone to attach a muscle.</p>
          )}
        </div>
      </div>
    );
  }
);

CreatureEditor.displayName = 'CreatureEditor';

export default CreatureEditor;

