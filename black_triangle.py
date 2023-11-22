import svgwrite
from cairosvg import svg2png
from PIL import Image
import io


class Point:
    x: float
    y: float
    xy: tuple[float, float]

    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y
        self.xy = (x, y)


class Triangle:
    points: tuple[Point, Point, Point]

    def __init__(self, p0: Point, p1: Point, p2: Point):
        self.points = (p0, p1, p2)

    def render(self, dwg: svgwrite.Drawing) -> None:
        dwg.add(
            dwg.polygon(
                points=[self.points[0].xy, self.points[1].xy, self.points[2].xy],
                fill="black",
            )
        )


def generate_triangle(width: float, height: float, step: float) -> Triangle:
    scale = (step % 5) / 4
    scaled_width = width * scale
    scaled_height = height * scale
    offset_x = (width - scaled_width) / 2
    offset_y = (height - scaled_height) / 2
    bottom_left = Point(offset_x, offset_y + scaled_height)
    top_middle = Point(width / 2, offset_y)
    bottom_right = Point(offset_x + scaled_width, offset_y + scaled_height)
    return Triangle(bottom_left, top_middle, bottom_right)


# Function to create an SVG image
def create_svg(filename: str, step: int):
    svg_width, svg_height = 100, 100

    dwg = svgwrite.Drawing(filename, size=(svg_width, svg_height), profile="tiny")
    # Draw a rectangle as the background
    dwg.add(dwg.rect(insert=(0, 0), size=(svg_width, svg_height), fill="white"))

    # User code
    t = generate_triangle(svg_width, svg_height, step)
    t.render(dwg)
    dwg.save()


# Function to convert SVG to PNG
def svg_to_png(svg_filename):
    with open(svg_filename, "rb") as svg_file:
        png_data = svg2png(file_obj=svg_file)
    return Image.open(io.BytesIO(png_data))


# Create two SVG images with inverted colors
for step in range(0, 5):
    create_svg(f"step-{step}.svg", step)

# Convert SVGs to PNGs
png_images = []
for step in range(0, 5):
    png_images.append(svg_to_png(f"step-{step}.svg"))

# Create an animated GIF
png_images[0].save(
    "animated.gif",
    save_all=True,
    append_images=png_images[1:],
    duration=1000,
    loop=0,
)

print("Animated GIF created and saved as 'animated.gif'")
