layout(binding = 0, std430) readonly buffer ElevationDataBufferIn
{
	float data[];
};
layout(binding = 1, std430) writeonly buffer ElevationDataBufferOut
{
	float out_data[];
};

uniform int nx;
uniform int ny;
uniform float amplitude;
uniform float cellSize;
uniform float tanThresholdAngle;

bool Inside(int i, int j)
{
	if (i < 0 || i >= nx || j < 0 || j >= ny)
		return false;
	return true;
}

int ToIndex1D(int i, int j)
{
	return i * nx + j;
}

void NoRaceConditionVersion(int x, int y)
{
	// Sample a 3x3 grid around the pixel
	float samples[9];
	for (int i = 0; i < 3; i++)
	{
		for (int j = 0; j < 3; j++)
		{
			ivec2 tapUV = (ivec2(x, y) + ivec2(i, j) - ivec2(1,1) + ivec2(nx, ny)) % ivec2(nx, ny);
			samples[i * 3 + j] = data[ToIndex1D(tapUV.x, tapUV.y)];
		}
	}
		
	// Check stability with all neighbours
	int id = ToIndex1D(x, y);
	float z = data[id];
	bool willReceiveMatter = false;
	bool willDistributeMatter = false;
	for (int i = 0; i < 9; i++)
	{
		float zd = samples[i] - z;
		if (zd / cellSize > tanThresholdAngle)
			willReceiveMatter = true;
		
		zd = z - samples[i];
		if (zd / cellSize > tanThresholdAngle)
			willDistributeMatter = true;
	}
	
	// Add/Remove matter if necessary
	float zOut = z + (willReceiveMatter ? amplitude : 0.0f) - (willDistributeMatter ? amplitude : 0.0f);
	out_data[id] = zOut;
}

layout(local_size_x = 8, local_size_y = 8, local_size_z = 1) in;
void main()
{
	int i = int(gl_GlobalInvocationID.x);
    int j = int(gl_GlobalInvocationID.y);	
	if (i < 0) return;
	if (j < 0) return;
	if (i >= nx) return;
	if (j >= ny) return;
	
	NoRaceConditionVersion(i, j);
}