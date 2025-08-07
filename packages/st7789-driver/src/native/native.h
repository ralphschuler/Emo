#ifndef NATIVE_H
#define NATIVE_H

#include <stdint.h>
#include <stddef.h>

// ---- SPI ----
int spi_open(const char* dev);
int spi_config(int fd, uint8_t mode, uint8_t bits, uint32_t speed_hz);
ssize_t spi_write_buf(int fd, const uint8_t* buf, size_t len);
int spi_close(int fd);
void msleep(unsigned ms);

// ---- GPIO (Sysfs, simpel) ----
int gpio_export(unsigned pin);
int gpio_unexport(unsigned pin);
int gpio_direction(unsigned pin, int is_output);
int gpio_write(unsigned pin, int value);

#endif // NATIVE_H
