const E3: vec3f = vec3f(17., 59.4, 15.);
const F3: f32 = .3333333;
const G3: f32 = .1666667;
const BASE_AMPLITUDE: f32 = .5333333;

// 	<www.shadertoy.com/view/XsX3zB>
//	by Nikita Miropolskiy
/* discontinuous pseudorandom uniformly distributed in [-0.5, +0.5]^3 */
fn random3(c : vec3f) -> vec3f {    
    var j = 4096. * sin(dot(c, E3));
    var r = vec3f(0., 0., fract(512. * j));
    j *= .125;
    r.x = fract(512. * j);
    j *= .125;
    r.y = fract(512. * j);
    return r - .5;
}

fn snoise(p : vec3f) -> f32 {    
    let s = floor(p + dot(p, vec3f(F3)));
    let x = p - s + dot(s, vec3f(G3));

    let e = step(vec3f(0.), x - x.yzx);
    let i1 = e * (1. - e.zxy);
    let i2 = 1. - e.zxy * (1. - e);

    let x1 = x - i1 + G3;
    let x2 = x - i2 + 2. * G3;
    let x3 = x - 1. + 3. * G3;

    var w = vec4f(dot(x, x), dot(x1, x1), dot(x2, x2), dot(x3, x3));
    w = max(.6 - w, vec4f(0.));

    var d = vec4f(dot(random3(s), x), dot(random3(s + i1), x1), dot(random3(s + i2), x2), dot(random3(s + 1.), x3));

    w *= w;
    w *= w;
    d *= w;

    return dot(d, vec4(52.));
}

fn snoiseFractal(m: vec3f, octaveCount: i32) -> f32 {
    var amplitude: f32 = BASE_AMPLITUDE;
    var octave: f32 = 1.;
    var value: f32 = 0.;
    for(var i: i32 = 0; i < octaveCount; i++) {
        value += amplitude * snoise(octave * m);
        amplitude *= 0.5;
        octave *= 2.;
    }
    return value;
}

fn ridgedNoiseFractal(m: vec3f, octaveCount: i32, ridgeThreshold: f32) -> f32 {
    var amplitude: f32 = BASE_AMPLITUDE;
    var octave: f32 = 1.;
    var value: f32 = 0.;
    for(var i: i32 = 0; i < octaveCount; i++) {
        value += amplitude * (1. - (abs(snoise(octave * m) + ridgeThreshold) - ridgeThreshold));
        amplitude *= 0.5;
        octave *= 2.;
    }
    return value;
}