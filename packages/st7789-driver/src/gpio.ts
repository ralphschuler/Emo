import { c } from "./native";

export class Gpio {
  constructor(public pin: number, public direction: "in" | "out" = "out") {
    c.gpioExport(pin);
    const rc = c.gpioDirection(pin, direction === "out");
    if (rc < 0) throw new Error(`GPIO direction failed for ${pin}`);
  }
  set(value: 0 | 1) {
    const rc = c.gpioWrite(this.pin, value);
    if (rc < 0) throw new Error(`GPIO write failed for ${this.pin}`);
  }
}
