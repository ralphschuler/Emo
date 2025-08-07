import { writeFileSync, existsSync, readFileSync } from "node:fs";

function gpioPath(pin: number, file?: string) {
  return file
    ? `/sys/class/gpio/gpio${pin}/${file}`
    : `/sys/class/gpio/gpio${pin}`;
}

export class Gpio {
  constructor(public pin: number, public direction: "in" | "out" = "out") {
    if (!existsSync(gpioPath(pin))) {
      writeFileSync("/sys/class/gpio/export", String(pin));
    }
    writeFileSync(gpioPath(pin, "direction"), direction);
  }

  set(value: 0 | 1) {
    if (this.direction !== "out")
      throw new Error("GPIO is not configured as output");
    writeFileSync(gpioPath(this.pin, "value"), value ? "1" : "0");
  }

  get(): 0 | 1 {
    const v = readFileSync(gpioPath(this.pin, "value"), "utf8").trim();
    return v === "1" ? 1 : 0;
  }
}
