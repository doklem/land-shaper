# Land Shaper
![Build Status](https://github.com/doklem/land-shaper/actions/workflows/webpack.yml/badge.svg?branch=main)

A terrain generator.

![LandShaper](https://github.com/doklem/land-shaper/assets/34248939/23d63bba-2a07-487b-beb3-87a5e0c9c9de)

## Getting Started
Try out the [demo](https://doklem.github.io/land-shaper/) or have a look at the [wiki](https://github.com/doklem/land-shaper/wiki), if you want to know more about its controls.

## Scope
A developer's pet project to learn the nooks and crannies of [WebGPU](https://www.w3.org/TR/webgpu/).

## Tech Stack
A web application written in [TypeScript](https://www.typescriptlang.org/) and [WGSL](https://www.w3.org/TR/WGSL/), which uses [ThreeJS](https://threejs.org/), [WebGPU](https://www.w3.org/TR/webgpu/) and [webpack](https://webpack.js.org/).

## Architecture
It uses [procedural noise](https://thebookofshaders.com/examples/?chapter=proceduralTexture) in the form of the [3D Simplex noise](https://en.wikipedia.org/wiki/Simplex_noise) posted on [Shadertoy](https://www.shadertoy.com/view/XsX3zB) by Nikita Miropolskiy to create the basic [displacement texture](https://en.wikipedia.org/wiki/Displacement_mapping). Further refinement is possible with thermal erosion derived from Axel Paris's [explanation](https://aparis69.github.io/public_html/posts/terrain_erosion_2.html) as well as hydraulic erosion based upon the droplet approach featured by Sebastian Lague of Coding Adventure on YouTube:

[![alt text](http://img.youtube.com/vi/eaXk97ujbPQ/0.jpg "Coding Adventure: Hydraulic Erosion")](https://www.youtube.com/watch?v=eaXk97ujbPQ)

The [normal-](https://en.wikipedia.org/wiki/Normal_mapping) and [diffuse-texture](https://en.wikipedia.org/wiki/Texture_mapping) as well as the [instanced object](https://en.wikipedia.org/wiki/Geometry_instancing) transformation matrices and colors are derived from the final displacement texture.

## Acknowledgements
- [3D Simplex noise from Nikita Miropolskiy on Shadertoy](https://www.shadertoy.com/view/XsX3zB)
- [Hydraulic erosion with droplet simulation from Sebastian Lague of Coding Adventures](https://github.com/SebLague/Hydraulic-Erosion)
- [Ocean from ThreeJS](https://threejs.org/examples/?q=water#webgl_shaders_ocean)
- [Sky from ThreeJS](https://threejs.org/examples/?q=sky#webgl_shaders_sky)
- [Book of Shaders](https://thebookofshaders.com/)
- [Rock LowPoly from AndreaDev3d on Sketchfab](https://sketchfab.com/3d-models/rock-lowpoly-e8035f8cadd64a8eb26780676850e8e8)
- [Thermal erosion by Axel Paris](https://aparis69.github.io/public_html/posts/terrain_erosion_2.html)
