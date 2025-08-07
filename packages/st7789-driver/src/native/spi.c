#include "native.h"

#include <stdio.h>
#include <string.h>
#include <fcntl.h>
#include <unistd.h>
#include <errno.h>
#include <sys/ioctl.h>
#include <linux/spi/spidev.h>

int spi_open(const char* dev) {
  int fd = open(dev, O_RDWR);
  return fd; // -1 bei Fehler
}

int spi_config(int fd, uint8_t mode, uint8_t bits, uint32_t speed_hz) {
  if (ioctl(fd, SPI_IOC_WR_MODE, &mode) < 0) return -1;
  if (ioctl(fd, SPI_IOC_WR_BITS_PER_WORD, &bits) < 0) return -2;
  if (ioctl(fd, SPI_IOC_WR_MAX_SPEED_HZ, &speed_hz) < 0) return -3;
  return 0;
}

ssize_t spi_write_buf(int fd, const uint8_t* buf, size_t len) {
  ssize_t w = write(fd, buf, len);
  return w; // < 0 = Fehler
}

int spi_close(int fd) {
  return close(fd);
}

void msleep(unsigned ms) {
  usleep(ms * 1000);
}
