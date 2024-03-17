import { Vector2 } from 'three';

export class QuadTree {

    private readonly _children: QuadTree[];
    private readonly _positions: Vector2[];

    private _currentIndex: number;

    constructor(originPosition: Vector2, size: Vector2, minSize: number) {
        this._currentIndex = 0;
        this._positions = [];

        this._positions.push(originPosition);

        let position = originPosition.clone();
        position.setX(position.x + size.x * 0.5);
        this._positions.push(position);

        position = position.clone();
        position.setY(position.y + size.y * 0.5);
        this._positions.push(position);

        position = position.clone();
        position.setX(position.x - size.x * 0.5);
        this._positions.push(position);

        if (size.x > minSize || size.y > minSize) {
            const halfSize = size.clone().multiplyScalar(0.5);
            this._children = this._positions.map(position => new QuadTree(position, halfSize, minSize));
        } else {
            this._children = [];
        }
    }

    public nextPosition(): Vector2 {
        this._currentIndex = (this._currentIndex + 1) % this._positions.length;
        if (this._children.length > 0) {
            return this._children[this._currentIndex].nextPosition();
        }
        return this._positions[this._currentIndex];
    }
}