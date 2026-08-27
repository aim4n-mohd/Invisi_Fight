# V2 visual direction and asset plan

## Target

Use a stylized tactical diorama designed for top-down readability:

- Chunky low-poly fighters with exaggerated weapons and strong facing silhouettes.
- Dark industrial arena floor with restrained panel lines and boundary machinery.
- Blue local fighter, cyan sonar, pale holographic detections, amber active shooter, white tracer, and red damage.
- Fixed orthographic presentation rather than cinematic realism.
- Sparse environmental detail inside the playable rectangle so the floor remains readable.

Existing palette starting point:

| Role                  | Color     |
| --------------------- | --------- |
| Arena background      | `#070C16` |
| Arena grid/panels     | `#1A2843` |
| Local fighter         | `#4D8CFF` |
| Sonar                 | `#4DB2FF` |
| Detection hologram    | `#D8E2FF` |
| Active shooter/reveal | `#FFBF33` |
| Shot line             | `#F5F7FB` |
| Damage/impact         | `#FF5C7A` |

## Art readability rules

- Judge all assets from the production camera and actual canvas size, not Blender close-ups.
- Fighter facing, weapon direction, active shooter, lock state, and damage must remain identifiable without reading names.
- Use shape, animation, brightness, and color together; never rely on color alone.
- Avoid realistic proportions, small weapons, noisy camouflage, glossy dark materials, and dense surface textures.
- Avoid large crates/walls in playable space until cover becomes an approved mechanic.
- Keep detection holograms visibly frozen rather than animating as if they track a live opponent.

## Vertical-slice asset list

Use temporary or CC0 assets for:

- One rigged fighter.
- One weapon.
- Idle, movement, aim, fire, hit, and elimination animations.
- One modular arena floor.
- Two or three boundary props outside playable space.
- Sonar pulse and hologram materials.
- Muzzle, tracer, impact, and miss effects.

The slice must show one complete round state sequence at actual gameplay scale before final asset work begins.

## Acquisition order

1. Create a single target frame/mood sheet defining camera, scale, palette, fighter proportions, arena density, sonar, and resolution lighting.
2. Prototype with primitives or coherent temporary low-poly assets.
3. Validate readability and performance in the Three.js slice.
4. Freeze the fighter scale, animation list, attachment points, material count, and texture budget.
5. Search for one coherent licensable family or commission a small custom set.
6. Import through Blender, normalize, export GLB, validate in-game, and record provenance.

Do not mix several unrelated marketplace packs into the final scene without a deliberate Blender restyle pass.

## Candidate sources and license handling

- Kenney: useful CC0 prototype props/weapons and simple 3D assets.
- Quaternius: useful CC0 low-poly models, source files, and atlas-based packs.
- Poly Pizza: useful discovery source, but license must be checked per model.
- Fab: large free/paid catalog; record the license attached to every acquired item and never redistribute source assets standalone.
- Custom artist: preferred final route when marketplace assets cannot provide one coherent fighter, weapon, and arena language.

License claims must be verified again on the exact asset page at acquisition time. Website-level guidance is not a substitute for the downloaded asset's license file.

## Asset register

Create `client/src/assets/3d/ASSET_REGISTER.md` when the first external asset is added. Each entry records:

- Runtime filename and source filename.
- Asset title, creator, and direct source URL.
- License name and license URL/file.
- Acquisition date.
- Whether attribution is required and where it appears.
- Modifications made in Blender or code.
- Original source storage location, kept out of the public bundle when redistribution is prohibited.
- Export settings and animation names.

## Final production asset brief

The smallest coherent final commission/purchase should cover:

- One modular fighter rig with 3-4 material variants.
- Clear weapon/facing silhouette from the fixed camera.
- Idle, locomotion, aim/strafe, lock confirmation, fire, hit, and elimination clips.
- Two or three weapon silhouettes only if they remain cosmetic; weapon mechanics are out of scope.
- Modular floor panels and perimeter dressing.
- Matching sonar, hologram, muzzle, tracer, impact, and miss treatment.
- Optional lobby/key art after the gameplay scene is approved.

## Technical delivery requirements

- GLB runtime export, meters/scale normalized to the agreed arena mapping.
- Grounded pivot, consistent forward axis, applied transforms, and predictable naming.
- Prefer one material/atlas per fighter family and minimal transparent materials.
- Texture dimensions justified by actual screen coverage; avoid 4K textures for small top-down props.
- Animation clips trimmed, loop flags documented, and root motion removed unless the renderer explicitly consumes it.
- No embedded license-incompatible content, fonts, or textures.
- Test asset loading from the GitHub Pages repository base path, not only localhost.

## Approval checklist

Final art acquisition begins only when:

- The 2D gameplay/fun gate has passed.
- The Three.js vertical slice is readable at target size.
- Camera angle and arena framing are frozen.
- Fighter scale and animation requirements are frozen.
- Performance and transfer budgets have been measured.
- The exact asset license allows the intended public web distribution.
- The source pack is coherent enough to avoid expensive restyling, or restyling cost is explicitly accepted.
