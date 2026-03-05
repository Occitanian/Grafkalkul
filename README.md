<div align="center">

# 🧮 Графический калькулятор на основе Ray Marching

[![Live Demo](https://img.shields.io/badge/LIVE_DEMO-Click_Here-4A154B?style=for-the-badge&logo=github&logoColor=white)](https://occitanian.github.io/Grafkalkul/)

**Интерактивная 3D-визуализация математических функций с использованием техники трассировки лучей (ray marching) и шейдерных эффектов свечения.**

</div>

---

## 📌 О проекте

Данный проект представляет собой графический калькулятор, который отображает трёхмерные графики функций двух переменных _z = f(x, y)_.  
В отличие от традиционного построения полигональной сетки, здесь используется **ray marching** – итеративный метод поиска пересечения луча с неявно заданной поверхностью. Это позволяет получать гладкие, детализированные изображения сложных математических форм, а шейдерные эффекты пост‑обработки добавляют реалистичное свечение.

Проект реализован на чистом **JavaScript** с использованием **WebGL** для рендеринга. Графический интерфейс построен на HTML5 и CSS, а вся вычислительная логика вынесена в отдельные скрипты, что делает код прозрачным и легко расширяемым.

---

## ✨ Возможности

- Построение 3D-графиков по введённой пользователем формуле (поддерживаются операторы `+ - * / ^`, функции `sin`, `cos`, `tan`, `abs`, `log10`, константа π).
- Предустановленные поверхности:
  - **Сфера** (по кнопке `SPH`)
  - **Конус / эллиптический параболоид** (`EPA`)
  - **Гиперболический параболоид** (`HPA`)
  - **Волны синуса и косинуса** (`WAW`)
  - **Корневая волна** (`ROF`)
  - **«Корона»** (`CRO`)
  - **Квадратные волны** (`ISH`)
- Свободное вращение камеры с помощью мыши (зажатая левая кнопка + движение).
- Приближение / отдаление колесом мыши.
- Полноэкранный интерфейс с кнопочной панелью для ввода и выбора функций.
- **Пост-обработка**: шейдеры `GlowHorizontal` и `GlowVertical` создают эффект мягкого свечения поверхности, подчёркивая её форму и улучшая восприятие глубины.

---

## 🧠 Алгоритмическая основа: Ray Marching

### 🔍 Что такое ray marching?

Ray marching – это метод рендеринга, при котором для каждого пикселя экрана пускается луч, и сцена «маршируется» (шаг за шагом) до тех пор, пока не будет найдено пересечение с поверхностью. В отличие от классической трассировки лучей, здесь не требуется аналитического решения пересечения – достаточно иметь **функцию расстояния со знаком (SDF)** для каждого объекта.

## 📐 Реализация в проекте

В файле [`[scriptsInEvents.js](scriptsInEvents.js)`](scripts/scriptsInEvents.js](https://github.com/Occitanian/Grafkalkul/blob/main/scripts/project/scriptsInEvents.js) содержится полный модуль ray marching, включающий:

#### **1. SDF-примитивы**

```javascript
function sdSphere(p, r) {
    return Math.hypot(p[0], p[1], p[2]) - r;
}

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

function sdTorus(p, r1, r2) {
    const q = [Math.hypot(p[0], p[2]) - r1, p[1]];
    return Math.hypot(q[0], q[1]) - r2;
}
```
#### **2. Комбинирование сцены**
Функция mapWorld(p) возвращает минимальное расстояние до ближайшего объекта (объединение нескольких примитивов).

```javascript
function mapWorld(p) {
    const sphere = sdSphere(p, 1.2);
    const box = sdBox([p[0] - 2.5, p[1], p[2]], [1.5, 1.5, 1.5]);
    const torus = sdTorus([p[0] + 2.5, p[1], p[2]], 2.0, 0.6);
    return Math.min(sphere, box, torus);
}
```
#### **3. Вычисление нормали**
Градиент SDF в точке – используется для освещения.

```javascript
function calcNormal(p) {
    const eps = 0.001;
    const dx = mapWorld([p[0] + eps, p[1], p[2]]) - mapWorld([p[0] - eps, p[1], p[2]]);
    const dy = mapWorld([p[0], p[1] + eps, p[2]]) - mapWorld([p[0], p[1] - eps, p[2]]);
    const dz = mapWorld([p[0], p[1], p[2] + eps]) - mapWorld([p[0], p[1], p[2] - eps]);
    const len = Math.hypot(dx, dy, dz);
    return len > 0 ? [dx / len, dy / len, dz / len] : [0, 0, 0];
}
```
#### **4. Освещение (Phong)**

```javascript
function phongLighting(p, viewDir, lightPos) {
    const normal = calcNormal(p);
    let lightDir = [
        lightPos[0] - p[0],
        lightPos[1] - p[1],
        lightPos[2] - p[2]
    ];
    const lightDist = Math.hypot(...lightDir);
    lightDir = lightDir.map(c => c / lightDist);

    const halfDir = [
        lightDir[0] + viewDir[0],
        lightDir[1] + viewDir[1],
        lightDir[2] + viewDir[2]
    ];
    const halfLen = Math.hypot(...halfDir);
    const half = halfLen > 0 ? halfDir.map(c => c / halfLen) : halfDir;

    const ambient = 0.2;
    const diffuse = Math.max(0, normal[0]*lightDir[0] + normal[1]*lightDir[1] + normal[2]*lightDir[2]);
    const specular = Math.pow(Math.max(0, normal[0]*half[0] + normal[1]*half[1] + normal[2]*half[2]), 32);

    const lightColor = [1.0, 0.9, 0.8];
    const objectColor = [0.3, 0.6, 1.0];

    return [
        objectColor[0] * (ambient + diffuse * lightColor[0]) + specular * lightColor[0],
        objectColor[1] * (ambient + diffuse * lightColor[1]) + specular * lightColor[1],
        objectColor[2] * (ambient + diffuse * lightColor[2]) + specular * lightColor[2]
    ];
}
```
#### **5. Основной цикл ray marching**
```javascript
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
            const viewDir = [-direction[0], -direction[1], -direction[2]];
            const lightPos = [5.0, 8.0, 5.0];
            const color = phongLighting(point, viewDir, lightPos);
            return { hit: true, distance: totalDist, point, color };
        }
        totalDist += dist;
        if (totalDist > maxDist) break;
    }
    // Фон – простой градиент
    const t = Math.abs(direction[1]);
    return { hit: false, color: [0.1 * t, 0.15 * t, 0.3 * t] };
}
```
#### **6. Генерация лучей камеры**
Функция getCameraRay строит луч для каждого пикселя, исходя из параметров камеры (позиция, цель, угол обзора).

#### **7. Полный рендер**
Функция renderRayMarchedScene создаёт canvas с изображением сцены, используя описанный алгоритм. В текущей версии графики этот модуль служит в первую очередь для демонстрации возможностей ray marching, а финальное изображение формируется с помощью комбинации мешей и шейдеров пост‑обработки.

### **✨ Шейдерные эффекты свечения**
Для усиления визуальной привлекательности и подчёркивания трёхмерной формы поверхностей используются два шейдера пост‑обработки:

`GlowHorizontal` – применяет размытие по горизонтали, создавая мягкое свечение, распространяющееся в стороны.

`GlowVertical` – аналогичное размытие по вертикали.

Оба шейдера работают на языке GLSL и выполняются непосредственно на GPU, что обеспечивает высокую производительность даже при большом количестве пикселей. Параметр intensity регулирует силу свечения, позволяя настраивать финальный вид.

Фрагмент вершинного и фрагментного шейдеров (сокращённо):

```glsl
varying mediump vec2 vTex;
uniform mediump sampler2D samplerFront;
uniform mediump vec2 pixelSize;
uniform mediump float intensity;

void main(void) {
    mediump vec4 sum = vec4(0.0);
    mediump float pixelHeight = pixelSize.y;
    // ... сбор соседних пикселей
    mediump vec4 front = texture2D(samplerFront, vTex);
    gl_FragColor = mix(front, max(front, sum), intensity);
}
```
Комбинация горизонтального и вертикального проходов даёт равномерное свечение вокруг ярких областей изображения.

## **🕹️ Управление**
Действие	Результат
Зажать левую кнопку мыши и двигать	Вращение сцены по горизонтали / вертикали
Колесо мыши	Приближение / отдаление камеры
Кнопки на панели	Ввод символов, выбор предустановленных функций, построение графика (EXE)

## **🛠️ Технологии**
Язык: JavaScript (ES6+)

Графика: WebGL 1.0 / 2.0

Шейдеры: GLSL (пост-обработка свечения)

Стили: CSS3 (адаптивный интерфейс)

Развёртывание: GitHub Pages (статический хостинг)

## **📂 Структура проекта (основные файлы)**
index.html – точка входа.

style.css – стили интерфейса.

scripts/scriptsInEvents.js – пользовательские скрипты, включая реализацию ray marching и функцию evalExpr.

scripts/main.js – основной код рантайма (сгенерирован автоматически, связывает интерфейс и логику).

data.json – экспортированные данные (события, объекты, слои) – используется для инициализации сцены.

images/ – спрайты для кнопок и элементов интерфейса.

<div align="center">
Мяу
Occitanian © 2025

</div> ```
