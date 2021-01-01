# Visual BB
------------


A visual tool for experiencing with bit manipulation, specially 64bit chess bitboards.

## Main features

- Code editor (syntax highlight) 
- Javascript arithmetic expressions
- Variables Context inspector
- Custom variables/functions: bit scan, bit reverse, byte swap, ...
- Bitboard editor to produce test values easly
- Results displayed as bitboards
- Runs in a browser, no server needed

## Supported syntax:

Each instruction should fit in a single line.

The code is executed sequentially line by line.

If there is an error in a given line, the execution will stop, the global context will not be changed.

Each instruction should be of the form:

```javascript
    variable_name = arithmetic expression
```

variable name should be compliant with javascript identifier spec.

The arithmetic expression can contains functions as long as they are accessible in the global scope

**Example:**

```javascript
// test rook attacks
occupied = 0b10000000100000000000010000000000001100001n
rook_pos = 0
attacks = BB.sliding_attack_v(occupied, rook_pos, BB.ROOK_ATTACKS.NORTH[rook_pos])
```

### Special instruction:

By default, any variable in the left side of the instruction will be displayed in the result panel.
To filter what is displayed, the first line should contain the instruction `#observe` followed by a comma separated list of variables.

**Example*:

Here only `y` will be visible in the result panel.

```javascript
#observe y
x = 0xFF00FF17n
y = x << 13
```


## Available custom variables/functions:

Available via a global variable named `BB`

### Variables:

- `RANKS`: an array of 8 bitboards representing each rank (0..7)
- `FILES`: an array of 8 bitboards representing each file (0..7)
- `SQUARES`: an array of 64 bitboards representing each square (0..63)
- `SQUARE_RANK`: an array mapping square index to rank bitboards (0..63)
- `SQUARE_FILE`: an array mapping square index to file bitboards (0..63)
- `ROOK_ATTACKS`: rook attacks for each direction and square index
    - `ROOK_ATTACKS.NORTH` (0..63)
    - `ROOK_ATTACKS.EAST` (0..63)
    - `ROOK_ATTACKS.SOUTH` (0..63)
    - `ROOK_ATTACKS.WEST` (0..63)
- `BISHOP_ATTACKS`: bishop attacks for each direction and square index
    - `BISHOP_ATTACKS.NORTH_EAST` (0..63)
    - `BISHOP_ATTACKS.SOUTH_EAST` (0..63)
    - `BISHOP_ATTACKS.NORTH_WEST` (0..63)
    - `BISHOP_ATTACKS.SOUTH_WEST` (0..63)
- `KNIGHT_ATTACKS`: knight attacks by square index (0..63)
- `KING_ATTACKS`: king attacks by square index (0..63)

### Functions:

- `bsf: (bb: bigint) => number`

    Returns the index of the first set bit + 1 if found otherwise 0

- `bit_reverse: (bb: bigint) => bigint`

    Reverses bitboard (a1 <-> h8, ...)

- `byte_swap: (bb: bigint) => bigint`

    Swaps bitboard bytes (ranks)

- `bit_positions: (bb: bigint) => number[]`

    Returns the list bitboard of set bit positions

- `sliding_attacks_diag: (occupied: bigint, suqareIndex: number, diagMask: bigint) => bigint`

    Returns sliding diagonal attacks of bishop/queen as a bitboard

- `sliding_attacks_h: (occupied: bigint, squareIndex: number) => bigint`

    Returns sliding horizontal attacks of rook/queen as a bitboard

- `sliding_attacks_v: (occupied: bigint, squareIndex: number, verticalMask: bigint) => bigint`

    Returns sliding vertical attacks of rook/queen as a bitboard


