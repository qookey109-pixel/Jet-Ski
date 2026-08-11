# Marine Physics Attribution

V0.9.8 Marine Physics Lab uses a clean-room, reduced 3DOF voxel-buoyancy implementation inspired by the architecture demonstrated in **QusaiAlbonni/three-sails**.

- Source project: `QusaiAlbonni/three-sails`
- Upstream feature reference: voxelization-based buoyancy, force-at-position rigid-body approach, water-surface sampling
- Upstream license: MIT
- Upstream copyright: Copyright (c) 2024 Qusai Albonni

The Jet-Ski implementation does not import Ape-ECS, upstream rigid-body classes, or upstream source files. It reimplements the concept against this project's existing `surfaceAt()` / 9-point hydrodynamics contract so the two models can be A/B tested in the browser.

`MohamedQatish/BoatPhysics3D` is treated only as behavioral/educational reference in V0.9.8 because no repository-wide root license was confirmed during this pass; its code/assets are not copied into this project.
