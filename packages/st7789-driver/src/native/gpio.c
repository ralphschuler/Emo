#include "native.h"

#include <stdio.h>
#include <string.h>
#include <fcntl.h>
#include <unistd.h>

static int write_str(const char* path, const char* s) {
  int fd = open(path, O_WRONLY);
  if (fd < 0) return -1;
  ssize_t n = write(fd, s, strlen(s));
  close(fd);
  return (n < 0) ? -2 : 0;
}

int gpio_export(unsigned pin) {
  char buf[16];
  snprintf(buf, sizeof(buf), "%u", pin);
  // Ignoriere Fehler, falls bereits exportiert
  write_str("/sys/class/gpio/export", buf);
  return 0;
}

int gpio_unexport(unsigned pin) {
  char buf[16];
  snprintf(buf, sizeof(buf), "%u", pin);
  return write_str("/sys/class/gpio/unexport", buf);
}

int gpio_direction(unsigned pin, int is_output) {
  char path[64];
  snprintf(path, sizeof(path), "/sys/class/gpio/gpio%u/direction", pin);
  return write_str(path, is_output ? "out" : "in");
}

int gpio_write(unsigned pin, int value) {
  char path[64];
  snprintf(path, sizeof(path), "/sys/class/gpio/gpio%u/value", pin);
  return write_str(path, value ? "1" : "0");
}
