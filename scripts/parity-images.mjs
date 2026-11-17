export async function imageDifference(page, a, b) {
  return page.evaluate(async ([a, b]) => {
    const decode = async value => {
      const image = new Image();
      image.src = "data:image/png;base64," + value;
      await image.decode();
      return image;
    };
    const [left, right] = await Promise.all([decode(a), decode(b)]);
    if (Math.abs(left.width - right.width) > 1 || Math.abs(left.height - right.height) > 1) return 1;
    const w = Math.min(left.width, right.width), h = Math.min(left.height, right.height);
    const pixels = image => {
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      return ctx.getImageData(0, 0, w, h).data;
    };
    const x = pixels(left), y = pixels(right);
    let different = 0;
    const match = (source, index, target, offset) =>
      Math.max(...[0, 1, 2].map(channel => Math.abs(source[index + channel] - target[offset + channel]))) <= 22;
    function near(source, target, row, col) {
      const index = (row * w + col) * 4;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (row + dy >= 0 && row + dy < h && col + dx >= 0 && col + dx < w &&
          match(source, index, target, ((row + dy) * w + col + dx) * 4)) return true;
      }
      return false;
    }
    for (let row = 0; row < h; row++) for (let col = 0; col < w; col++) {
      if (!near(x, y, row, col) || !near(y, x, row, col)) different++;
    }
    return different / (w * h);
  }, [a.toString("base64"), b.toString("base64")]);
}
