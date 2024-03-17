# Land Shaper
A generator for terrain.

See the live [demo](https://doklem.github.io/land-shaper/).

It uses [procedural noise](https://thebookofshaders.com/examples/?chapter=proceduralTexture) in the form of the [3D Simplex noise](https://en.wikipedia.org/wiki/Simplex_noise) posted on [Shadertoy by Nikita Miropolskiy](https://www.shadertoy.com/view/XsX3zB) to create the basic displacement texture. It is further refined with a hydraulic erosion simulation based upon the droplet approach featured by Sebastian Lague of Coding Adventure on YouTube:

[![alt text](http://img.youtube.com/vi/eaXk97ujbPQ/0.jpg "Coding Adventure: Hydraulic Erosion")](https://www.youtube.com/watch?v=eaXk97ujbPQ)

The normal- and diffuse-texture as well as the instanced object matrices and colors are derived from the final displacement texture.

## Scope
A developer's pet project to learn the nooks and crannies of [WebGPU](https://www.w3.org/TR/webgpu/).

## Architecture

### Tech Stack
A web application writen in [TypeScript](https://www.typescriptlang.org/) and [WGSL](https://www.w3.org/TR/WGSL/), which uses [ThreeJS](https://threejs.org/), [webpack](https://webpack.js.org/) and [WebGPU](https://www.w3.org/TR/webgpu/).

### Technical Debts
- As of now the code flow is highly inefficient: textures and buffers are generated with [WebGPU](https://www.w3.org/TR/webgpu/), exported back to the CPU, and then reimported to the GPU with [WebGL](https://get.webgl.org/). The intermediate steps need to be stripped away and everything needs to be kept in the GPU when [ThreeJS](https://threejs.org/)'s WebGPU nodes API is stable.

## Acknowledgements
- [3D Simplex noise from Nikita Miropolskiy on Shadertoy](https://www.shadertoy.com/view/XsX3zB)
- [Hydraulic erosion with droplet simulation from Sebastian Lague of Coding Adventures](https://github.com/SebLague/Hydraulic-Erosion)
- [Ocean from ThreeJS](https://threejs.org/examples/?q=water#webgl_shaders_ocean)
- [Sky from ThreeJS](https://threejs.org/examples/?q=sky#webgl_shaders_sky)
- [Book of Shaders](https://thebookofshaders.com/)
- [Rock LowPoly from AndreaDev3d on Sketchfab](https://sketchfab.com/3d-models/rock-lowpoly-e8035f8cadd64a8eb26780676850e8e8)