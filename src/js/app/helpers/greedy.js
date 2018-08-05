import * as THREE from 'three';
// a Voxtor is a voxel vector - x,y,z,color
function xyziToVoxtor(voxtor, currentValue, index) {
    const properties = [ "x", "y", "z", "color" ];
    voxtor[properties[index]] = index < 3 ? parseFloat(currentValue) : currentValue;
    return voxtor;
};

class Quad {
    constructor(x, y, z, width, height, color) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.width = width || 1;
        this.height = height || 1;
        // this.color = color || "white";
        this.color = color ? new THREE.Color(parseInt(color, 16)) : 0xffffff;
    }
    add(quad) {
        this.x += quad.x ? quad.x : 0;
        this.y += quad.y ? quad.y : 0;
        this.z += quad.z ? quad.z : 0;
        this.width += quad.width ? quad.width : 0;
        this.height += quad.height ? quad.height : 0;
    }
    sub(quad) {
        this.x -= quad.x ? quad.x : 0;
        this.y -= quad.y ? quad.y : 0;
        this.z -= quad.z ? quad.z : 0;
        this.width -= quad.width ? quad.width : 0;
        this.height -= quad.height ? quad.height : 0;
    }

}

class Greedy {
    constructor(voxels) {
        this.palette = [ 0 ];
        this.modelSize = { width: 0, height: 0 };
        this.model = [];
        let voxtors = [];
        let minX = 0, minY = 0, minZ = 0, maxX = 0, maxY = 0, maxZ = 0;
        for (const voxel of voxels) {
            if (voxel.indexOf("#") !== 0 && voxel.indexOf(" ") !== -1) {
                const xyzi = voxel.split(" ").reduce(xyziToVoxtor, {});
                voxtors.push(xyzi);    
                if(xyzi.x > maxX) maxX = xyzi.x;
                if(xyzi.y > maxY) maxY = xyzi.y;
                if(xyzi.z > maxZ) maxZ = xyzi.z;

                if(xyzi.x < minX) minX = xyzi.x;
                if(xyzi.y < minY) minY = xyzi.y;
                if(xyzi.z < minZ) minZ = xyzi.z;
                if(this.palette.indexOf(xyzi.color) == -1) {
                    this.palette.push(xyzi.color);
                }
            }
        }
        this.boundingBox = {
            x: minX, y: minY, z: minZ,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
            depth: maxZ - minZ + 1
        };
        this.model.length = this.boundingBox.width * this.boundingBox.height * this.boundingBox.depth;
        this.model.fill(0);
        for(const voxtor of voxtors) {
            const index = this.toIndex(voxtor.x, voxtor.y, voxtor.z);
            this.model[index] = this.palette.indexOf(voxtor.color);            
        }
    }
    toIndex(x, y, z) {
        // normalize, then return index
        x -= this.boundingBox.x;
        y -= this.boundingBox.y;
        z -= this.boundingBox.z;
        if (x < 0 || x > this.boundingBox.width || 
            y < 0 || y > this.boundingBox.height || 
            z < 0 || z > this.boundingBox.depth) {
            ////console.log("out of bounds");
            return "OUT OF BOUNDS";
        }
        return y * this.boundingBox.width + x + (this.boundingBox.height * this.boundingBox.width * z);
    }
    getMask(direction, depth, reverse) {
        let mask = [];
        let horizontal = { start: this.boundingBox.x, end: this.boundingBox.x + this.boundingBox.width };
        let vertical = { start: this.boundingBox.y, end: this.boundingBox.y + this.boundingBox.height };

        switch(direction) {
            case 1:
                horizontal = { start: this.boundingBox.x, end: this.boundingBox.x + this.boundingBox.width };
                vertical = { start: this.boundingBox.z, end: this.boundingBox.z + this.boundingBox.depth };
                break;
            case 2:
                horizontal = { start: this.boundingBox.y, end: this.boundingBox.y + this.boundingBox.height };
                vertical = { start: this.boundingBox.z, end: this.boundingBox.z + this.boundingBox.depth };
                break;
            default:
                break;
        }
        let depths = ["z", "y", "x" ];
        let ranges = ["depth", "height", "width" ];
        let depthBoundary = this.boundingBox[ depths[direction] ];
        let depthNeighbor = -1;
        if(reverse) {
            depthBoundary += this.boundingBox[ ranges[direction] ] - 1;
            depthNeighbor = 1;
        }
        
        for(let x = horizontal.start; x < horizontal.end; x++) {
            for(let y = vertical.start; y < vertical.end; y++) {
                let xMask = x - horizontal.start;
                let yMask = y - vertical.start;
                mask[xMask] = mask[xMask] || [];
                let index = 0;
                let neighbor = 0;
                switch(direction) {
                    case 0:
                        index = this.toIndex(x, y, depth);       
                        neighbor = depth !== depthBoundary ? this.model[this.toIndex(x, y, depth + depthNeighbor)] : 0;
                        break;
                    case 1:
                        index = this.toIndex(x, depth, y);   
                        neighbor = depth !== depthBoundary ? this.model[this.toIndex(x, depth + depthNeighbor, y)] : 0;
                        break;
                    case 2:
                        index = this.toIndex(depth, x, y);       
                        neighbor = depth !== depthBoundary ? this.model[this.toIndex(depth + depthNeighbor, x, y)] : 0;
                        break;
                    default: 
                        break;
                }
                if(neighbor === 0) {
                    mask[xMask][yMask] = this.model[index];
                } else {
                    mask[xMask][yMask] = 0;
                }
            }
        }
        return mask;
    }

    getQuads(mask, depth) {
        let quads = [];
        let x = 0, y = 0;
        while (y < mask[0].length) {
            if (mask[x][y]) {
                let quadWidth = 1;
                let quadHeight = 1;
                let next = x + 1;
                while (next < mask.length) {
                    if (mask[next][y] == mask[x][y]) {
                        quadWidth++;
                    } else {
                        break;
                    }
                    next++;
                }
                next = y + 1;
                let lineMatch = true;
                while (next < mask[0].length && lineMatch) {
                    for (let l = 0; l < quadWidth; l++) {
                        if (mask[x + l][next] != mask[x][y]) {
                            lineMatch = false;
                        }
                    }
                    if (lineMatch) {
                        quadHeight++;
                        next++;
                    }
                }
                let quad = new Quad( x, y, depth, quadWidth, quadHeight, this.palette[mask[x][y]] );
                quads.push(quad);
                for (let mx = x; mx < x + quadWidth; mx++) {
                    for (let my = y; my < y + quadHeight; my++) {
                        mask[mx][my] = false;
                    }
                }
                x += quadWidth;
                if (x >= mask.length) {
                    x = 0;
                    y++;
                }

            } else {
                x++;
                if (x >= mask.length) {
                    x = 0;
                    y++;
                }
            }
        }
        return quads;
    }

}

export default Greedy;
