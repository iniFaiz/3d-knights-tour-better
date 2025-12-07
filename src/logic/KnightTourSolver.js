export class KnightTourSolver {
    constructor(width, length, height) {
        this.dims = [width, length, height];
        this.totalCells = width * length * height;
    }

    isValid(x, y, z, board) {
        return (
            x >= 0 && x < this.dims[0] &&
            y >= 0 && y < this.dims[1] &&
            z >= 0 && z < this.dims[2] &&
            board[x][y][z] === -1
        );
    }

    getKnightMoves(x, y, z) {
        const moves = [];
        const candidates = [
            [1, 2, 0], [1, -2, 0], [-1, 2, 0], [-1, -2, 0],
            [2, 1, 0], [2, -1, 0], [-2, 1, 0], [-2, -1, 0],
            [0, 1, 2], [0, 1, -2], [0, -1, 2], [0, -1, -2],
            [0, 2, 1], [0, 2, -1], [0, -2, 1], [0, -2, -1],
            [1, 0, 2], [1, 0, -2], [-1, 0, 2], [-1, 0, -2],
            [2, 0, 1], [2, 0, -1], [-2, 0, 1], [-2, 0, -1]
        ];
        for (let c of candidates) {
            moves.push([x + c[0], y + c[1], z + c[2]]);
        }
        return moves;
    }

    getDegree(x, y, z, board) {
        let count = 0;
        const moves = this.getKnightMoves(x, y, z);
        for (let m of moves) {
            if (this.isValid(m[0], m[1], m[2], board)) count++;
        }
        return count;
    }

    createBoard() {
        const b = new Array(this.dims[0]);
        for(let i=0; i<this.dims[0]; i++){
            b[i] = new Array(this.dims[1]);
            for(let j=0; j<this.dims[1]; j++){
                b[i][j] = new Array(this.dims[2]).fill(-1);
            }
        }
        return b;
    }

    // Backtracking
    *solveBacktracking(startPos) {
        const board = this.createBoard();
        const [sx, sy, sz] = startPos;
        board[sx][sy][sz] = 0;

        function* recursiveBt(self, cx, cy, cz, step) {
            yield { type: 'move', pos: [cx, cy, cz], step: step };

            if (step === self.totalCells - 1) return true;

            const moves = self.getKnightMoves(cx, cy, cz);
            for (let [nx, ny, nz] of moves) {
                if (self.isValid(nx, ny, nz, board)) {
                    board[nx][ny][nz] = step + 1;
                    if (yield* recursiveBt(self, nx, ny, nz, step + 1)) return true;
                    
                    // Backtrack
                    board[nx][ny][nz] = -1;
                    yield { type: 'revert', pos: [nx, ny, nz], step: step + 1 };
                    yield { type: 'backtrack', pos: [cx, cy, cz], step: step };
                }
            }
            return false;
        }

        yield* recursiveBt(this, sx, sy, sz, 0);
    }

    // Warnsdorff
    *solveWarnsdorff(startPos) {
        const board = this.createBoard();
        let curr = [...startPos];
        board[curr[0]][curr[1]][curr[2]] = 0;
        let step = 0;

        yield { type: 'move', pos: curr, step: step };

        while (step < this.totalCells - 1) {
            let moves = [];
            for (let [nx, ny, nz] of this.getKnightMoves(curr[0], curr[1], curr[2])) {
                if (this.isValid(nx, ny, nz, board)) {
                    const deg = this.getDegree(nx, ny, nz, board);
                    moves.push({ deg, pos: [nx, ny, nz] });
                }
            }

            if (moves.length === 0) {
                yield { type: 'stuck', pos: curr, step: step };
                return false;
            }

            moves.sort((a, b) => a.deg - b.deg);
            
            const best = moves[0].pos;
            step++;
            curr = best;
            board[curr[0]][curr[1]][curr[2]] = step;
            yield { type: 'move', pos: curr, step: step };
        }
        return true;
    }

    *solveCombined(startPos) {
        const board = this.createBoard();
        const [sx, sy, sz] = startPos;
        board[sx][sy][sz] = 0;

        function* recursiveWbt(self, cx, cy, cz, step) {
            yield { type: 'move', pos: [cx, cy, cz], step: step };

            if (step === self.totalCells - 1) return true;

            let possibleMoves = [];
            for (let [nx, ny, nz] of self.getKnightMoves(cx, cy, cz)) {
                if (self.isValid(nx, ny, nz, board)) {
                    const deg = self.getDegree(nx, ny, nz, board);
                    possibleMoves.push({ deg, pos: [nx, ny, nz] });
                }
            }
            
            possibleMoves.sort((a, b) => a.deg - b.deg);

            for (let { pos } of possibleMoves) {
                const [nx, ny, nz] = pos;
                board[nx][ny][nz] = step + 1;
                
                if (yield* recursiveWbt(self, nx, ny, nz, step + 1)) return true;

                board[nx][ny][nz] = -1;
                yield { type: 'revert', pos: [nx, ny, nz], step: step + 1 };
                yield { type: 'backtrack', pos: [cx, cy, cz], step: step };
            }
            return false;
        }

        yield* recursiveWbt(this, sx, sy, sz, 0);
    }
}