const scriptsInEvents = {

	async Events_Event13_Act1(runtime, localVars)
	{
		/* The eval function takes a string and read it as code using the JS interpreter. Be very careful using such technique in production, as code can be injected. This template mitigates this problem by using an on-screen keyboard with very limited possibilities. In a real scenario, the best course of action would be to use a library that provides a dedicated mathematical-only evaluator or, considering a more general case, to create a parser. */
		
		// Try to evaluate the mathematical expression. If there is an error, return 0.
		try {
			runtime.setReturnValue(eval(localVars.expr));
		} catch (error) {
			runtime.setReturnValue(0);
		}
		
	}

};

// SDF-примитивы
// Функции расстояния со знаком (Signed Distance Functions - аббревиатура)

// Сфера
function sdSphere(p, r) {
    return Math.hypot(p[0], p[1], p[2]) - r;
}

// Кубик
function sdBox(p, b) {
    const d = [
        Math.abs(p[0]) - b[0],
        Math.abs(p[1]) - b[1],
        Math.abs(p[2]) - b[2]
    ];
    const outside = Math.hypot(Math.max(d[0], 0), Math.max(d[1], 0), Math.max(d[2], 0));
    const inside = Math.min(Math.max(d[0], d[1], d[2]), 0);
    return outside + inside;
}

// Тор
function sdTorus(p, r1, r2) {
    const q = [Math.hypot(p[0], p[2]) - r1, p[1]];
    return Math.hypot(q[0], q[1]) - r2;
}

// Сцена
function mapWorld(p) {
    // Сфера с радиусом 1.2
    const sphere = sdSphere(p, 1.2);
    // Куб с размерами [1.5, 1.5, 1.5], смещённый по оси X
    const box = sdBox([p[0] - 2.5, p[1], p[2]], [1.5, 1.5, 1.5]);
    // Тор с большой радиус 2.0 и малой 0.6
    const torus = sdTorus([p[0] + 2.5, p[1], p[2]], 2.0, 0.6);
    // Минимальное расстояние – объединение объектов
    return Math.min(sphere, box, torus);
}

// Вычисление нормали
function calcNormal(p) {
    const eps = 0.001;
    const dx = mapWorld([p[0] + eps, p[1], p[2]]) - mapWorld([p[0] - eps, p[1], p[2]]);
    const dy = mapWorld([p[0], p[1] + eps, p[2]]) - mapWorld([p[0], p[1] - eps, p[2]]);
    const dz = mapWorld([p[0], p[1], p[2] + eps]) - mapWorld([p[0], p[1], p[2] - eps]);
    const len = Math.hypot(dx, dy, dz);
    return len > 0 ? [dx / len, dy / len, dz / len] : [0, 0, 0];
}

// Освещение фонговское
function phongLighting(p, viewDir, lightPos) {
    const normal = calcNormal(p);
    
    // Направление на источник света
    let lightDir = [
        lightPos[0] - p[0],
        lightPos[1] - p[1],
        lightPos[2] - p[2]
    ];
    const lightDist = Math.hypot(...lightDir);
    lightDir = lightDir.map(c => c / lightDist);
    
    // Отражённый луч (половинный вектор)
    const halfDir = [
        lightDir[0] + viewDir[0],
        lightDir[1] + viewDir[1],
        lightDir[2] + viewDir[2]
    ];
    const halfLen = Math.hypot(...halfDir);
    const half = halfLen > 0 ? halfDir.map(c => c / halfLen) : halfDir;
    
    // Коэффициенты
    const ambient = 0.2;
    const diffuse = Math.max(0, normal[0]*lightDir[0] + normal[1]*lightDir[1] + normal[2]*lightDir[2]);
    const specular = Math.pow(Math.max(0, normal[0]*half[0] + normal[1]*half[1] + normal[2]*half[2]), 32);
    
    const lightColor = [1.0, 0.9, 0.8]; // тёплый свет
    const objectColor = [0.3, 0.6, 1.0]; // голубоватый
    
    return [
        objectColor[0] * (ambient + diffuse * lightColor[0]) + specular * lightColor[0],
        objectColor[1] * (ambient + diffuse * lightColor[1]) + specular * lightColor[1],
        objectColor[2] * (ambient + diffuse * lightColor[2]) + specular * lightColor[2]
    ];
}

// Основной цикл Ray Marching
function rayMarch(origin, direction, maxSteps = 256, maxDist = 100, epsilon = 0.001) {
    let totalDist = 0;
    for (let step = 0; step < maxSteps; step++) {
        const point = [
            origin[0] + direction[0] * totalDist,
            origin[1] + direction[1] * totalDist,
            origin[2] + direction[2] * totalDist
        ];
        const dist = mapWorld(point);
        if (dist < epsilon) {
            // Попадание – вычисляем цвет в точке
            const viewDir = [-direction[0], -direction[1], -direction[2]];
            const lightPos = [5.0, 8.0, 5.0]; // источник света
            const color = phongLighting(point, viewDir, lightPos);
            return { hit: true, distance: totalDist, point, color };
        }
        totalDist += dist;
        if (totalDist > maxDist) break;
    }
    // Фон-градиент
    const t = Math.abs(direction[1]); // простой градиент по Y
    return { hit: false, color: [0.1 * t, 0.15 * t, 0.3 * t] };
}

// енерация лучей камеры
function getCameraRay(x, y, width, height, camPos, camTarget, camUp, fov) {
    const aspect = width / height;
    const tanFov = Math.tan(fov * 0.5 * Math.PI / 180);
    
    // Базис камеры
    const forward = [
        camTarget[0] - camPos[0],
        camTarget[1] - camPos[1],
        camTarget[2] - camPos[2]
    ];
    const fwdLen = Math.hypot(...forward);
    const F = forward.map(c => c / fwdLen);
    
    const right = [
        F[1]*camUp[2] - F[2]*camUp[1],
        F[2]*camUp[0] - F[0]*camUp[2],
        F[0]*camUp[1] - F[1]*camUp[0]
    ];
    const rightLen = Math.hypot(...right);
    const R = right.map(c => c / rightLen);
    
    const U = [
        R[1]*F[2] - R[2]*F[1],
        R[2]*F[0] - R[0]*F[2],
        R[0]*F[1] - R[1]*F[0]
    ];
    
    // Координаты на плоскости проекции
    const ndcX = (2.0 * (x + 0.5) / width - 1.0) * aspect * tanFov;
    const ndcY = (1.0 - 2.0 * (y + 0.5) / height) * tanFov;
    
    // Направление луча
    const dir = [
        F[0] + R[0] * ndcX + U[0] * ndcY,
        F[1] + R[1] * ndcX + U[1] * ndcY,
        F[2] + R[2] * ndcX + U[2] * ndcY
    ];
    const dirLen = Math.hypot(...dir);
    const D = dir.map(c => c / dirLen);
    
    return { origin: camPos, direction: D };
}

// Полный рендер сцены
// Эта функция рисует рэймарчированное изображение в canvas
function renderRayMarchedScene(canvasWidth, canvasHeight) {
    const camPos = [0, 2, -8];
    const camTarget = [0, 0, 0];
    const camUp = [0, 1, 0];
    const fov = 60;
    
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(canvasWidth, canvasHeight);
    const data = imageData.data;
    
    for (let y = 0; y < canvasHeight; y++) {
        for (let x = 0; x < canvasWidth; x++) {
            const ray = getCameraRay(x, y, canvasWidth, canvasHeight, camPos, camTarget, camUp, fov);
            const result = rayMarch(ray.origin, ray.direction);
            const r = Math.min(255, Math.max(0, Math.floor(result.color[0] * 255)));
            const g = Math.min(255, Math.max(0, Math.floor(result.color[1] * 255)));
            const b = Math.min(255, Math.max(0, Math.floor(result.color[2] * 255)));
            const idx = (y * canvasWidth + x) * 4;
            data[idx] = r;
            data[idx+1] = g;
            data[idx+2] = b;
            data[idx+3] = 255;
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

self.C3.ScriptsInEvents = scriptsInEvents;
