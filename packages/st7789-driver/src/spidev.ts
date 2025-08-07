import { symbols, cstr } from "./ffi";
import { readdirSync, statSync } from "node:fs";

const SPI_IOC_WR_MODE = 0x40016b01n;
const SPI_IOC_WR_MAX_SPEED_HZ = 0x40046b04n;
const SPI_IOC_WR_BITS_PER_WORD = 0x40016b03n;

function firstAvailableSpidev(): string | null {
  try {
    const devs = readdirSync("/dev")
      .filter((f) => f.startsWith("spidev"))
      .map((f) => `/dev/${f}`)
      .filter((p) => {
        try { return statSync(p).isCharacterDevice(); } catch { return false; }
      })
      .sort(); // deterministisch; z.B. /dev/spidev0.0 zuerst
    return devs[0] ?? null;
  } catch {
    return null;
  }
}

export class SpiDev {
  fd: number;
  dev: string;

  constructor(dev?: string) {
    this.dev = dev ?? firstAvailableSpidev() ?? "/dev/spidev0.0";
    this.fd = symbols.open(cstr(this.dev).ptr, /*O_RDWR*/ 0x0002, 0);

    if (this.fd < 0) {
      const hint = [
        `Konnte ${this.dev} nicht öffnen.`,
        `Tipps:`,
        `  • SPI aktiviert? (raspi-config / dtparam=spi=on)`,
        `  • Existiert ein anderes Device? (ls /dev/spidev*)`,
        `  • Nutzer in Gruppe 'spi'? (usermod -aG spi $USER, neu anmelden)`,
        `  • Testweise mit sudo laufen lassen.`,
      ].join("\n");
      throw new Error(`open(${this.dev}) failed\n${hint}`);
    }
  }

  setMode(mode: number) {
    const buf = Buffer.from([mode]);
    const rc = symbols.ioctl(this.fd, Number(SPI_IOC_WR_MODE), buf);
    if (rc < 0) throw new Error("ioctl WR_MODE failed");
  }
  setBitsPerWord(bits = 8) {
    const buf = Buffer.from([bits]);
    const rc = symbols.ioctl(this.fd, Number(SPI_IOC_WR_BITS_PER_WORD), buf);
    if (rc < 0) throw new Error("ioctl WR_BITS_PER_WORD failed");
  }
  setMaxSpeed(hz = 62_500_000) {
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(hz, 0);
    const rc = symbols.ioctl(this.fd, Number(SPI_IOC_WR_MAX_SPEED_HZ), buf);
    if (rc < 0) throw new Error("ioctl WR_MAX_SPEED_HZ failed");
  }
  write(buf: Buffer) {
    const n = symbols.write(this.fd, buf, buf.byteLength);
    if (n < 0 || n !== buf.byteLength) throw new Error("spi write failed");
  }
  close() {
    if (this.fd >= 0) symbols.close(this.fd);
    this.fd = -1;
  }
}
