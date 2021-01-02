// Visual BB, Copyright: (c) 2020, Najmeddine Nouri
// GNU General Public License v3.0+ (see LICENSE or https://www.gnu.org/licenses/gpl-3.0.txt)

const _BSF64Indices = [
    0, 1, 2, 19, 10, 3, 20, 28,
    25, 11, 14, 4, 21, 56, 39,
    29, 17, 26, 12, 37, 15, 47,
    5, 49, 7, 22, 44, 57, 60,
    40, 51, 30, 63, 18, 9, 27,
    24, 13, 55, 38, 16, 36, 46,
    48, 6, 43, 59, 50, 62, 8,
    23, 54, 35, 45, 42, 58, 61,
    53, 34, 41, 52, 33, 32, 31
];

const _BSF64DebruijnConst = 0x2c4a191fa76af37n;

const BB = {
    RANKS: [
        0xffn,              // rank 1
        0xff00n,            // rank 2
        0xff0000n,          // rank 3
        0xff000000n,        // rank 4
        0xff00000000n,      // rank 5
        0xff0000000000n,    // rank 6
        0xff000000000000n,  // rank 7
        0xff00000000000000n // rank 8
    ],
    FILES: [
        0x101010101010101n,  // file a
        0x202020202020202n,  // file b
        0x404040404040404n,  // file c
        0x808080808080808n,  // file d
        0x1010101010101010n, // file e
        0x2020202020202020n, // file f
        0x4040404040404040n, // file g
        0x8080808080808080n  // file h
    ],
    SQUARES: <bigint[]>[],
    SQUARE_RANK: <bigint[]>[],
    SQUARE_FILE: <bigint[]>[],
    ROOK_ATTACKS: {
        NORTH: <bigint[]>[],
        EAST: <bigint[]>[],
        SOUTH: <bigint[]>[],
        WEST: <bigint[]>[]
    },
    BISHOP_ATTACKS: {
        NORTH_EAST: <bigint[]>[],
        SOUTH_EAST: <bigint[]>[],
        NORTH_WEST: <bigint[]>[],
        SOUTH_WEST: <bigint[]>[]
    },
    KNIGHT_ATTACKS: <bigint[]>[],
    KING_ATTACKS: <bigint[]>[],
    /**
     * bitScanForward
     * @author Charles E. Leiserson
     *         Harald Prokop
     *         Keith H. Randall
     * "Using de Bruijn Sequences to Index a 1 in a Computer Word"
     * @param bb bitboard to scan
     * @precondition bb != 0
     * @return index (0..63) of least significant one bit
     */
    bsf(bb: bigint) {
        if (bb == 0n) {
            return 0;
        }

        const idx = (((bb & (-bb)) * _BSF64DebruijnConst) >> 58n) & 0x3fn;
        return _BSF64Indices[Number(idx)] + 1;
    },
    bit_reverse(bb: bigint) {
        bb = (bb & 0x5555555555555555n) << 1n | (bb >> 1n) & 0x5555555555555555n;
        bb = (bb & 0x3333333333333333n) << 2n | (bb >> 2n) & 0x3333333333333333n;
        bb = (bb & 0x0f0f0f0f0f0f0f0fn) << 4n | (bb >> 4n) & 0x0f0f0f0f0f0f0f0fn;
        bb = (bb & 0x00ff00ff00ff00ffn) << 8n | (bb >> 8n) & 0x00ff00ff00ff00ffn;

        return (bb << 48n) | ((bb & 0xffff0000n) << 16n) |
            ((bb >> 16n) & 0xffff0000n) | (bb >> 48n);
    },
    byte_swap(bb: bigint) {
        let bbs = (bb & 0xFFn) << 56n;
        bbs |= ((bb >> 8n) & 0xFFn) << 48n;
        bbs |= ((bb >> 16n) & 0xFFn) << 40n;
        bbs |= ((bb >> 24n) & 0xFFn) << 32n;
        bbs |= ((bb >> 32n) & 0xFFn) << 24n;
        bbs |= ((bb >> 40n) & 0xFFn) << 16n;
        bbs |= ((bb >> 48n) & 0xFFn) << 8n;
        bbs |= ((bb >> 56n) & 0xFFn);

        return bbs;
    },
    bit_positions(bb: bigint) {
        const l = [];
        while (bb != 0n) {
            const idx = BB.bsf(bb);
            if(idx == 0)  {
                break;
            }

            l.push(idx - 1);
            bb = bb & (bb - 1n);
        }
        return l;
    },
    sliding_attacks_diag(occupied: bigint, suqareIndex: number, diagMask: bigint) {
        if (diagMask == 0n) {
            return 0n
        }

        const square = BB.SQUARES[suqareIndex];

        let forward = occupied & diagMask; // also performs the first subtraction by clearing the s in o
        let reverse = BB.byte_swap(forward); // o'-s'
        forward -= (square); // o -2s
        reverse -= BB.byte_swap(square); // o'-2s'
        forward ^= BB.byte_swap(reverse);
        return forward & diagMask;      // mask the line again
    },
    sliding_attacks_h(occupied: bigint, squareIndex: number) {
        const square = BB.SQUARES[squareIndex];
        const bbr = BB.bit_reverse(occupied);
        const sr = BB.bit_reverse(square);

        return ((occupied - 2n * square) ^ BB.bit_reverse(bbr - 2n * sr)) & BB.SQUARE_RANK[squareIndex];
    },
    sliding_attacks_v(occupied: bigint, squareIndex: number, verticalMask: bigint) {
        return BB.sliding_attacks_diag(occupied, squareIndex, verticalMask);
    },
    from_fen(fen: string) {
        fen = (fen || '').trim();
        if(fen == '') {
            return 0n;
        }

        const ranks = fen.split(' ').shift().split('/')
            .map(r => r.split(''));

        if(ranks.length != 8 || ranks.some(r => r.length == 0)) {
            return 0n
        }

        let binStr = ranks.map(rank => {
            let rankStr = '';
            for(let c of rank) {
                const cAsNumber = Number(c);
                if(isNaN(cAsNumber)) {
                    rankStr += '1';
                } else {
                    rankStr += new Array(cAsNumber + 1).map(_ => '').join('0');
                }
            }
            return rankStr
        }).reverse()
        .join('');

        return BigInt(`0b${binStr}`);
    }
};


(function () {
    for (let i = 0; i < 64; i++) {
        BB.SQUARES[i] = 2n ** BigInt(i);

        const rank = i / 8;
        const file = i % 8;
        BB.SQUARE_RANK[i] = BB.RANKS[rank];
        BB.SQUARE_FILE[i] = BB.FILES[file];
    }
}());

// generic sliding attacks generation
function _generateSlidingPositions(position: number, increments: number[][]) {
    const file = position % 8;
    const rank = (position - file) / 8;

    let res = 0n;

    increments.forEach(dirInc => {
        let mFile = file + dirInc[0];
        let mRank = rank + dirInc[1];

        while (mFile >= 0 && mRank >= 0 && mFile <= 7 && mRank <= 7) {
            const mPos = mFile + (mRank * 8);
            res |= BB.SQUARES[mPos];
            mFile += dirInc[0];
            mRank += dirInc[1];
        }
    });

    return res;
}

// rook attacks by square index
(function () {
    for (let i = 0; i < 64; i++) {
        BB.ROOK_ATTACKS.NORTH[i] = _generateSlidingPositions(i, [[0, 1]]);
        BB.ROOK_ATTACKS.EAST[i] = _generateSlidingPositions(i, [[1, 0]]);
        BB.ROOK_ATTACKS.SOUTH[i] = _generateSlidingPositions(i, [[0, -1]]);
        BB.ROOK_ATTACKS.WEST[i] = _generateSlidingPositions(i, [[-1, 0]]);
    }
}());

// bishop attacks by square index
(function () {
    for (let i = 0; i < 64; i++) {
        BB.BISHOP_ATTACKS.NORTH_EAST[i] = _generateSlidingPositions(i, [[1, 1]]);
        BB.BISHOP_ATTACKS.NORTH_WEST[i] = _generateSlidingPositions(i, [[-1, 1]]);
        BB.BISHOP_ATTACKS.SOUTH_EAST[i] = _generateSlidingPositions(i, [[1, -1]]);
        BB.BISHOP_ATTACKS.SOUTH_WEST[i] = _generateSlidingPositions(i, [[-1, -1]]);
    }
}());

const allFilled: bigint = 0xffffffffffffffffn;
const notFileA: bigint = allFilled ^ BB.FILES[0];
const notFileAB: bigint = allFilled ^ (BB.FILES[0] | BB.FILES[1]);
const notFileH: bigint = allFilled ^ BB.FILES[7];
const notFileGH: bigint = allFilled ^ (BB.FILES[6] | BB.FILES[7]);
const notRank1: bigint = allFilled ^ BB.RANKS[0];
const notRank12: bigint = allFilled ^ (BB.RANKS[0] | BB.RANKS[1]);
const notRank8: bigint = allFilled ^ BB.RANKS[7];
const notRank78: bigint = allFilled ^ (BB.RANKS[6] | BB.RANKS[7]);

// knight attacks by square index
(function () {
    /*
        |...|...|...|...|...|...|...|...|
        |...|...|...|...|...|...|...|...|
        |...|...| 15|...| 17|...|...|...|
        |...|  6|...|...|...| 10|...|...|
        |...|...|...| X |...|...|...|...|
        |...|-10|...|...|...| -6|...|...|
        |...|...|-17|...|-15|...|...|...|
        |...|...|...|...|...|...|...|...|
    */

    for (let i = 0; i < 64; i++) {
        const sq = BB.SQUARES[i];
        let attacks = 0n;
        attacks |= (sq << 17n) & notFileA & notRank12;
        attacks |= (sq << 10n) & notFileAB & notRank1;
        attacks |= (sq << 15n) & notFileH & notRank12;
        attacks |= (sq << 6n) & notFileGH & notRank1;
        attacks |= (sq >> 17n) & notFileH & notRank78;
        attacks |= (sq >> 10n) & notFileGH & notRank8;
        attacks |= (sq >> 15n) & notFileA & notRank78;
        attacks |= (sq >> 6n) & notFileAB & notRank8;
        BB.KNIGHT_ATTACKS[i] = attacks;
    }
}());

// king attacks by square index
(function () {
    /*
        |...|...|...|...|...|...|...|...|
        |...|...|...|...|...|...|...|...|
        |...|...|...|...|...|...|...|...|
        |...|...|  7|  8|  9|...|...|...|
        |...|...| -1| X |  1|...|...|...|
        |...|...| -9| -8| -7|...|...|...|
        |...|...|...|...|...|...|...|...|
        |...|...|...|...|...|...|...|...|
    */

    for (let i = 0; i < 64; i++) {
        const sq = BB.SQUARES[i];
        let attacks = 0n;
        attacks |= (sq << 1n) & notFileA;
        attacks |= (sq << 9n) & notFileA & notRank1;
        attacks |= (sq << 8n) & notRank1;
        attacks |= (sq << 7n) & notFileH & notRank1;
        attacks |= (sq >> 1n) & notFileH;
        attacks |= (sq >> 9n) & notFileH & notRank8;
        attacks |= (sq >> 8n) & notRank8;
        attacks |= (sq >> 7n) & notFileA & notRank8;
        BB.KING_ATTACKS[i] = attacks;
    }
}());

const _getObjectMembers = (obj: any) => {
    return Object.keys(obj).map(memName => {
        const memVal = (<any>obj)[memName];
        const memType = Object.prototype.toString.apply(memVal);
        let title: string = null;

        if (memType.indexOf('Function') >= 0) {
            let fsig: string = memVal.toString();
            fsig = fsig.substr(0, fsig.indexOf('{')).trim();
            fsig = fsig.replace('Function', memName);
            title = fsig;
        } else if (memType.indexOf('Array') >= 0) {
            title = `${typeof memVal[0]}[]`;

        } else if (memType.indexOf('Object') >= 0) {
            const memMems = _getObjectMembers(memVal);
            title = '{\n' + memMems.map(mm => `  ${mm.name}: ${mm.title}`).join('\n') + '\n}';
        } else {
            title = typeof memVal;
        }

        return {
            name: memName,
            title: title
        }
    });
}

export const installBBFunctions = () => {
    // set BB global variable
    (<any>window).BB = BB;
}

export declare type BBType = typeof BB;

export const BBMembers = _getObjectMembers(BB);