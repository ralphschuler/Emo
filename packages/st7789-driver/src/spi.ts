import { c } from "./native";

export class SpiDev {
  fd = -1;
  constructor(public dev = "/dev/spidev0.0") {
    this.fd = c.spiOpen(dev);
    if (this.fd < 0) throw new Error(`SPI open failed for ${dev}`);
  }
  config({ mode = 0, bits = 8, speedHz = 31_000_000 } = {}) {
    const rc = c.spiConfig(this.fd, mode, bits, speedHz);
    if (rc < 0) throw new Error(`SPI config failed (code ${rc})`);
  }
  write(buf: Buffer) {
    const n = c.spiWrite(this.fd, buf);
    if (n < 0 || n !== buf.byteLength) {
      throw new Error(`SPI write failed (${n}/${buf.byteLength})`);
    }
  }
  close() {
    if (this.fd >= 0) c.spiClose(this.fd);
    this.fd = -1;
  }
  msleep(ms: number) { c.msleep(ms); }
}
