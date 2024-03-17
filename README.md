# Land Shaper
A generator for terrain.

See the live [demo](https://doklem.github.io/land-shaper/).

It uses [procedural noise](https://thebookofshaders.com/examples/?chapter=proceduralTexture) in the form of the [3D Simplex noise](https://en.wikipedia.org/wiki/Simplex_noise) posted on [Shadertoy by Nikita Miropolskiy](https://www.shadertoy.com/view/XsX3zB) to create the basic displacement texture.

The texture is further refined with a hydraulic erosion simulation based upon the droplet approach featured by Sebastian Lague of Coding Adventure on YouTube:

[![Hydraulic Erosion](https://www.youtube.com/watch?v=eaXk97ujbPQ/0.jpg)](https://www.youtube.com/watch?v=eaXk97ujbPQ).

## Scope
A developer's pet project to learn the nooks and crannies of [WebGPU](https://www.w3.org/TR/webgpu/).

## Architecture

### Tech Stack
A web application writen in [TypeScript](https://www.typescriptlang.org/) and [WGSL](https://www.w3.org/TR/WGSL/), which uses [ThreeJS](https://threejs.org/), [webpack](https://webpack.js.org/) and [WebGPU](https://www.w3.org/TR/webgpu/).

### Technical Debts
- As of now the code flow is highly inefficient: textures and buffers are generated with [WebGPU](https://www.w3.org/TR/webgpu/), exported back to the CPU, and then reimported to the GPU with [WebGL](https://get.webgl.org/). The intermediate steps need to be stripped away and everything needs to be kept in the GPU when [ThreeJS](https://threejs.org/)'s WebGPU nodes API is stable.

## Acknowledgements
- [3d Simplex noise from Nikita Miropolskiy on Shadertoy](https://www.shadertoy.com/view/XsX3zB)
- [Hydraulic erosion with droplet simulation from Sebastian Lague of Coding Adventures](https://github.com/SebLague/Hydraulic-Erosion)
- [Sky from ThreeJS](https://threejs.org/examples/?q=sky#webgl_shaders_sky)
- [Book of Shaders](https://thebookofshaders.com/)