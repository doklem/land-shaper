# Land Shaper
![status main branch](https://github.com/doklem/land-shaper/actions/workflows/webpack.yml/badge.svg?branch=main)

A terrain generator.

![LandShaper](https://github.com/doklem/land-shaper/assets/34248939/23d63bba-2a07-487b-beb3-87a5e0c9c9de)

## Getting Started
See the [live demo](https://doklem.github.io/land-shaper/) to try it out or have a look at the [wiki](https://github.com/doklem/land-shaper/wiki), if you want to know more.

## Scope
A developer's pet project to learn the nooks and crannies of [WebGPU](https://www.w3.org/TR/webgpu/).

## Tech Stack
A web application written in [TypeScript](https://www.typescriptlang.org/) and [WGSL](https://www.w3.org/TR/WGSL/), which uses [ThreeJS](https://threejs.org/), [webpack](https://webpack.js.org/) and [WebGPU](https://www.w3.org/TR/webgpu/).

## Architecture
It uses [procedural noise](https://thebookofshaders.com/examples/?chapter=proceduralTexture) in the form of the [3D Simplex noise](https://en.wikipedia.org/wiki/Simplex_noise) posted on [Shadertoy by Nikita Miropolskiy](https://www.shadertoy.com/view/XsX3zB) to create the basic displacement texture, which is then further refined with a hydraulic erosion simulation based upon the droplet approach featured by Sebastian Lague of Coding Adventure on YouTube:

[![alt text](http://img.youtube.com/vi/eaXk97ujbPQ/0.jpg "Coding Adventure: Hydraulic Erosion")](https://www.youtube.com/watch?v=eaXk97ujbPQ)

The normal- and diffuse-texture as well as the instanced object transformation matrices and colors are derived from the final displacement texture.

## Acknowledgements
- [3D Simplex noise from Nikita Miropolskiy on Shadertoy](https://www.shadertoy.com/view/XsX3zB)
- [Hydraulic erosion with droplet simulation from Sebastian Lague of Coding Adventures](https://github.com/SebLague/Hydraulic-Erosion)
- [Ocean from ThreeJS](https://threejs.org/examples/?q=water#webgl_shaders_ocean)
- [Sky from ThreeJS](https://threejs.org/examples/?q=sky#webgl_shaders_sky)
- [Book of Shaders](https://thebookofshaders.com/)
- [Rock LowPoly from AndreaDev3d on Sketchfab](https://sketchfab.com/3d-models/rock-lowpoly-e8035f8cadd64a8eb26780676850e8e8)
