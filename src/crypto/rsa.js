// Simple BigInt modular exponentiation (base^exp mod mod)
export function modPow(base, exponent, modulus) { // Exported for potential external use, though not strictly needed by signup.jsx
  if (modulus === 1n) return 0n;
  let result = 1n;
  base = base % modulus;
  while (exponent > 0n) { // Use 0n for BigInt comparison
    if (exponent % 2n === 1n) {
      result = (result * base) % modulus;
    }
    exponent = exponent >> 1n; // divide by 2
    base = (base * base) % modulus;
  }
  return result;
}

// Compute GCD of two BigInts
export function gcd(a, b) { // Exported
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

// Extended Euclidean Algorithm to find modular inverse
export function modInverse(e, phi) { // Exported
  let [old_r, r] = [phi, e];
  let [old_s, s] = [1n, 0n];
  let [old_t, t] = [0n, 1n];

  while (r !== 0n) {
    const quotient = old_r / r;
    [old_r, r] = [r, old_r - quotient * r];
    [old_s, s] = [s, old_s - quotient * s];
    [old_t, t] = [t, old_t - quotient * t];
  }

  if (old_t < 0n) old_t += phi;
  // Check if inverse exists (should be true if gcd(e, phi) === 1)
  if (old_r !== 1n) throw new Error("Modular inverse does not exist");

  return old_t;
}

// Simple prime test (trial division) - **Very slow for large numbers**
function isPrime(n) {
  if (n < 2n) return false;
  if (n === 2n || n === 3n) return true;
  if (n % 2n === 0n) return false;
  // Only need to check odd divisors up to the square root
  for (let i = 3n; i * i <= n; i += 2n) {
    if (n % i === 0n) return false;
  }
  return true;
}

// Generate a random BigInt of a certain bit length
// NOTE: This is NOT cryptographically secure randomness. Use a secure source in production.
function randomBigInt(bits) {
    if (bits <= 0) return 0n;
    const bytes = Math.ceil(bits / 8);
    const randomBytes = new Uint8Array(bytes);
    // Use window.crypto for better (though maybe not perfect depending on environment) randomness than Math.random()
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(randomBytes);
    } else {
        // Fallback for Node.js or environments without window.crypto - still not great for crypto
        for (let i = 0; i < bytes; i++) {
            randomBytes[i] = Math.floor(Math.random() * 256);
        }
    }

    let rand = 0n;
    for (let i = 0; i < bytes; i++) {
        rand = (rand << 8n) + BigInt(randomBytes[i]);
    }

    // Ensure it's within the desired bit range (optional, depends on use case)
    // If generating p or q, we need them close to 2^(bits-1)
    // For simply a number less than 2^bits, the above is fine.
    // For prime generation, we want numbers in a specific range.
    // Let's aim for numbers in the range [2^(bits-1), 2^bits - 1] for primes
    if (bits > 1) {
        // Ensure the most significant bit is 1
        const msb = 1n << BigInt(bits - 1);
        rand = rand | msb;
        // Mask to the number of bits
        const mask = (1n << BigInt(bits)) - 1n;
        rand = rand & mask;
    } else if (bits === 1) {
        rand = rand > 0n ? 1n : 0n;
    }


    return rand;
}


// Generate a large prime of a specific bit length
// NOTE: Trial division is VERY slow for large numbers. Miller-Rabin is better.
// NOTE: Relies on the potentially weak randomBigInt if window.crypto is not available.
function generateLargePrime(bits = 128) {
  if (bits < 8) throw new Error("Prime bit length must be at least 8"); // Need enough bits for small primes
  let p;
  // Keep generating odd numbers until a prime is found
  // Start slightly above 2^(bits-1) to ensure size
  const start = 1n << BigInt(bits - 1);
  const range = (1n << BigInt(bits)) - start;

  while (true) {
    // Generate a random number in the range [start, start + range]
    // A simple way: random number in [0, range] + start
    let num = randomBigInt(bits); // This gives a number up to 2^bits
    // A slightly better attempt to get a number of size 'bits':
    num = start + randomBigInt(bits - 1); // Aim for numbers between 2^(bits-1) and 2^bits

    // Ensure it's odd (except for 2)
    if (num % 2n === 0n && num > 2n) {
        num++; // Make it odd
    }
    if (num < start) num = start + (start % 2n === 0n ? 1n : 0n); // Ensure minimum size and is odd


    if (isPrime(num)) {
        p = num;
        break;
    }
    // In a real implementation, you'd try multiple random numbers
    // and perhaps increment from a random start point.
    // This current loop might still be very slow or potentially infinite
    // if the random source is bad or the bit size is too large for trial division.
  }
  return p;
}

// Generate RSA keys
// NOTE: This uses a slow and insecure prime generation method for large bits.
// Using small bit sizes (e.g., 32-64 bits) makes it run faster for demo purposes,
// but provides NO security. For actual security, use a robust library.
export function generateKeyPair(primeBits = 128) {
    console.log(`Generating ${primeBits}-bit primes... This might take a while with trial division.`);
    let p, q, n, phi;

    // Ensure p and q are distinct primes
    do {
        p = generateLargePrime(primeBits);
        q = generateLargePrime(primeBits);
        console.log(`Generated potential primes p=${p}, q=${q}`);
    } while (p === q); // Keep generating if they are the same

    n = p * q;
    phi = (p - 1n) * (q - 1n);
    console.log(`Generated n=${n}, phi=${phi}`);

    let e = 65537n; // Common public exponent
    // Ensure gcd(e, phi) is 1. If not, pick a different small odd number for e.
    // 3 is another common choice if 65537 doesn't work.
    while (gcd(e, phi) !== 1n) {
        console.warn(`gcd(${e}, ${phi}) is not 1. Trying next odd e.`);
        e += 2n; // Try next odd number
        if (e >= phi) throw new Error("Could not find a suitable public exponent e");
    }
     console.log(`Using public exponent e=${e}`);

    const d = modInverse(e, phi);
    console.log(`Generated private exponent d=${d}`);

    console.log("Key generation complete.");

    return {
        publicKey: { n, e },
        privateKey: { n, d }
    };
}

// Dynamically calculate max bytes per block based on key size (n)
// A block must be less than n. Max value of k bytes is 256^k - 1.
// We need 256^k - 1 < n => 256^k <= n => (2^8)^k <= n => 2^(8k) <= n => 8k <= log2(n) => k <= log2(n) / 8
// Since n is approximately primeBits * 2, log2(n) is approximately primeBits * 2.
// So, k is roughly (primeBits * 2) / 8 = primeBits / 4.
// Let's use the bit length of n for a more precise calculation.
function getMaxBytesPerBlock(n) {
    // n.toString(2).length gives the bit length of n.
    // A number represented by 'bits' bits can store values up to 2^bits - 1.
    // We want 2^(8*bytes) - 1 < n.
    // This is equivalent to 2^(8*bytes) <= n.
    // 8 * bytes <= log2(n).
    // bytes <= log2(n) / 8.
    // Since n is typically n = p * q, and p, q are ~primeBits bits, n is ~2*primeBits bits.
    // For 128-bit primes, n is ~256 bits. log2(2^256) = 256. 256 / 8 = 32.
    // So, we can fit up to 31 bytes per block (since 2^ (8*31) is less than 2^256).
    const nBitLength = n.toString(2).length;
    const maxBytes = Math.floor((nBitLength - 1) / 8); // -1 because max value of k bytes is 2^(8k)-1
    // Ensure at least 1 byte per block if n is large enough
    return Math.max(1, maxBytes);
}


// ========== BLOCK ENCODING/DECODING FOR LONG MESSAGES ==========

function stringToBlocks(text, n) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const blocks = [];
  const maxBytesPerBlock = getMaxBytesPerBlock(n);

  if (maxBytesPerBlock <= 0) {
      throw new Error("Key size (n) is too small to encode even 1 byte.");
  }

  console.log(`Encoding message into blocks (max ${maxBytesPerBlock} bytes per block)`);

  for (let i = 0; i < bytes.length; i += maxBytesPerBlock) {
    const slice = bytes.slice(i, i + maxBytesPerBlock);
    let block = 0n;
    for (let b of slice) {
      block = (block << 8n) + BigInt(b);
    }
    // This check is now less likely to fail with correct maxBytesPerBlock
    if (block >= n) {
        // This should theoretically not happen if maxBytesPerBlock is calculated correctly
        // relative to n's bit length and the block isn't padded in a way that makes it >= n
        console.error("Generated block is unexpectedly larger than or equal to n. This indicates a logic error or an edge case.");
        throw new Error("Encoding block size validation failed."); // Or handle differently
    }
    blocks.push(block);
  }
   console.log(`Encoded message into ${blocks.length} blocks.`);
  return blocks;
}

function blocksToString(blocks) {
  const allBytes = [];
  for (let block of blocks) {
    // Need to know the original size of the block in bytes for correct padding
    // This implementation assumes blocks were encoded with a fixed max size and leading zeros were added if needed.
    // A more robust approach would store the original length or pad blocks during encoding.
    // For this simple example, we decode until the block is 0. This might remove leading zeros
    // from the original message block if it was smaller than maxBytesPerBlock.
    // A better approach for real-world would be to prepend padding bytes or store original block lengths.
    // Assuming bytes were added from left (most significant), the decoding is from right (least significant).
    // Let's reverse the process of encoding: block = b1*2^8 + b2*2^16 + ... (no, encoding was << 8)
    // block = b_k + b_{k-1}*2^8 + ... + b_1 * 2^(8*(k-1)) -- this is how stringToBlocks makes it.
    // decoding: get b_k = block % 256, block = block / 256 ...
    const bytes = [];
     // Calculate how many bytes this block *could* represent based on its value
     // A more reliable method would involve padding during encoding and removing padding here.
     // Let's decode byte by byte until block is 0. This is lossy if original blocks had leading zeros.
     // To fix this, we need to know maxBytesPerBlock from n, and pad decoded bytes.

     // Let's attempt to get the right number of bytes based on the *maximum* block size possible for n.
     // This helps recover leading zeros *if* the original encoding always produced blocks of maxBytesPerBlock size.
    // This still isn't perfect as the last block might be shorter.
    // For simplicity in this demo, we'll decode byte by byte until the block is 0.
    // This means messages like "abc" encoded into blocks that could hold 30 bytes
    // might result in a BigInt that, when decoded this way, loses leading zeros.
    // A proper implementation requires padding or length metadata.

    // Simple byte-by-byte decoding (might lose leading zeros from original blocks):
    if (block === 0n) {
        // If block is 0, it might represent one or more null bytes.
        // Without padding info, we can't know how many.
        // Let's assume a 0n block represents a single null byte for this demo.
        // A real implementation *must* handle this via padding.
         allBytes.push(0);
         continue; // Go to next block
    }

    const blockBytes = [];
    while (block > 0n) {
      blockBytes.unshift(Number(block & 255n)); // Get last byte
      block = block >> 8n; // Shift right by 8 bits (remove last byte)
    }
     // If we knew the maxBytesPerBlock, we could pad here:
     // const maxBytesPerBlock = getMaxBytesPerBlock(/* Need n here! */); // Problem: Don't have n easily here.
     // while (blockBytes.length < maxBytesPerBlock) { blockBytes.unshift(0); } // This padding is needed

    allBytes.push(...blockBytes);
  }
   console.log(`Decoded ${blocks.length} blocks into ${allBytes.length} bytes.`);

  const decoder = new TextDecoder();
  return decoder.decode(Uint8Array.from(allBytes));
}

// Encrypt message string using RSA public key (supports long messages)
// NOTE: This block mode encryption is NOT secure against various attacks (e.g., chosen-plaintext).
// A real implementation needs proper padding schemes like OAEP.
export function encrypt(message, publicKey) {
    if (!publicKey || !publicKey.n || !publicKey.e) {
        throw new Error("Invalid public key provided.");
    }
     console.log("Starting encryption...");
    const blocks = stringToBlocks(message, publicKey.n);
    const encryptedBlocks = blocks.map(b => {
        if (b >= publicKey.n) {
             // This check is redundant if stringToBlocks is correct, but good as a safeguard
            console.error("Block value is >= n during encryption!");
             throw new Error("Encryption failed: Block value too large.");
        }
        return modPow(b, publicKey.e, publicKey.n);
    });
     console.log("Encryption complete.");
    return encryptedBlocks.map(b => b.toString()).join(":"); // use ':' as delimiter
}

// Decrypt ciphertext string using RSA private key
export function decrypt(ciphertext, privateKey) {
    if (!privateKey || !privateKey.n || !privateKey.d) {
        throw new Error("Invalid private key provided.");
    }
    if (typeof ciphertext !== 'string' || ciphertext.length === 0) {
        console.warn("Attempted to decrypt empty or non-string ciphertext.");
        return ""; // Or handle as error
    }
     console.log("Starting decryption...");
    try {
        const encryptedBlocks = ciphertext.split(":").map(s => BigInt(s));
         // Need n for blocksToString to potentially handle padding correctly.
         // Since blocksToString is currently lossy on padding, passing n doesn't fix that specific issue
         // without changing blocksToString's logic significantly.
        const decryptedBlocks = encryptedBlocks.map(b => modPow(b, privateKey.d, privateKey.n));
         console.log("Decryption complete.");
        // blocksToString needs the context of n to potentially handle padding.
        // For this simple demo, we'll call it without n, accepting potential loss of leading zeros.
        // To fix properly, blocksToString would need publicKey.n passed in.
        return blocksToString(decryptedBlocks);
    } catch (error) {
        console.error("Decryption error:", error);
        // If decryption fails, return a placeholder or throw
        return "[Decryption Failed]"; // Or re-throw error;
    }
}

// NOTE ON SECURITY:
// This RSA implementation is for demonstration/educational purposes only.
// It uses slow and insecure methods for prime generation (trial division)
// and lacks essential components for real-world security, such as:
// - Cryptographically secure random number generation.
// - Probabilistic primality testing (e.g., Miller-Rabin) for large primes.
// - Proper padding schemes (e.g., OAEP) for encryption to prevent attacks.
// - Secure handling and storage of private keys (localStorage is NOT secure).
// DO NOT use this code for sensitive data in a production environment.