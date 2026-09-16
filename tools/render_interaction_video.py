#!/usr/bin/env python3
"""Render an anonymous 64 x 64 m DriveCAST BEV rollout animation."""

import argparse
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


WIDTH, HEIGHT = 1440, 600
BACKGROUND, INK, MUTED = "#f4f7f8", "#17245f", "#697680"
PANEL_BG, ROAD, SIDEWALK = "#edf2f4", "#d6dfe4", "#e5ebee"
EDGE, MARKING, VEHICLE = "#8b99a5", "#ffffff", "#91aaba"
ACTOR, EGO, EXECUTION = "#ef8c47", "#007e76", "#76508f"
TITLE_COLORS = ["#b77710", "#d46b49", "#147ca8"]
REGULAR_FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD_FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(size, bold=False):
    return ImageFont.truetype(BOLD_FONT if bold else REGULAR_FONT, size)


def text_width(draw, text, selected_font):
    return draw.textsize(text, font=selected_font)[0]


def point_mapper(limits, size, padding=14):
    left_min, left_max, forward_min, forward_max = limits
    scale = min(
        (size[0] - 2 * padding) / (left_max - left_min),
        (size[1] - 2 * padding) / (forward_max - forward_min),
    )
    offset_x = (size[0] - scale * (left_max - left_min)) / 2
    offset_y = (size[1] - scale * (forward_max - forward_min)) / 2

    def point(left, forward):
        return (
            round(offset_x + (left_max - left) * scale),
            round(size[1] - offset_y - (forward - forward_min) * scale),
        )

    return point


def interpolate(track, timestamp):
    times, coordinates = track["t"], track["xy"]
    if timestamp < times[0] or timestamp > times[-1]:
        return None
    for index in range(1, len(times)):
        if times[index] >= timestamp:
            previous_t, following_t = times[index - 1], times[index]
            weight = (timestamp - previous_t) / (following_t - previous_t or 1)
            previous_xy, following_xy = coordinates[index - 1], coordinates[index]
            left = previous_xy[0] + (following_xy[0] - previous_xy[0]) * weight
            forward = previous_xy[1] + (following_xy[1] - previous_xy[1]) * weight
            return (
                left,
                forward,
                following_xy[0] - previous_xy[0],
                following_xy[1] - previous_xy[1],
            )
    return coordinates[-1][0], coordinates[-1][1], 0, 1


def trajectory_points(track, point, until=None):
    return [
        point(*coordinates)
        for timestamp, coordinates in zip(track["t"], track["xy"])
        if timestamp <= 3 and (until is None or timestamp <= until)
    ]


def draw_dashed_line(draw, points, color, width=2):
    for start, end in zip(points, points[1:]):
        dx, dy = end[0] - start[0], end[1] - start[1]
        steps = max(1, int(math.hypot(dx, dy) / 5))
        for step in range(steps):
            if step % 2 == 0:
                draw.line(
                    (
                        start[0] + dx * step / steps,
                        start[1] + dy * step / steps,
                        start[0] + dx * (step + 1) / steps,
                        start[1] + dy * (step + 1) / steps,
                    ),
                    fill=color,
                    width=width,
                )


def draw_vehicle(draw, state, track, point, color, outline="#ffffff"):
    if not state:
        return
    left, forward, tangent_left, tangent_forward = state
    norm = math.hypot(tangent_left, tangent_forward) or 1
    along = (tangent_left / norm, tangent_forward / norm)
    across = (-along[1], along[0])
    length, width = track.get("length_width_m", [4.8, 1.9])
    corners = []
    for longitudinal, lateral in ((1, 1), (1, -1), (-1, -1), (-1, 1)):
        corners.append(
            point(
                left + longitudinal * length / 2 * along[0] + lateral * width / 2 * across[0],
                forward + longitudinal * length / 2 * along[1] + lateral * width / 2 * across[1],
            )
        )
    draw.polygon(corners, fill=color, outline=outline)
    nose = point(left + length * 0.28 * along[0], forward + length * 0.28 * along[1])
    draw.ellipse((nose[0] - 2, nose[1] - 2, nose[0] + 2, nose[1] + 2), fill="#ffffff")


def draw_panel(case, trajectory, panel_index, timestamp, size):
    image = Image.new("RGB", size, PANEL_BG)
    draw = ImageDraw.Draw(image)
    screen = point_mapper([-32, 32, -32, 32], size)
    ego_track = trajectory["ego"]
    ego_state = interpolate(ego_track, max(ego_track["t"][0], min(timestamp, ego_track["t"][-1])))
    ego_left, ego_forward, heading_left, heading_forward = ego_state
    if math.hypot(heading_left, heading_forward) < 1e-8:
        heading_left, heading_forward = 0, 1
    norm = math.hypot(heading_left, heading_forward) or 1
    sine, cosine = heading_left / norm, heading_forward / norm

    def point(left, forward):
        dl, df = left - ego_left, forward - ego_forward
        return screen(cosine * dl - sine * df, sine * dl + cosine * df)

    for polygon in case["map"]["sidewalk"]:
        draw.polygon([point(*coordinates) for coordinates in polygon], fill=SIDEWALK)
    for polygon in case["map"]["road"]:
        draw.polygon([point(*coordinates) for coordinates in polygon], fill=ROAD, outline=EDGE)
    for marking in case["map"]["markings"]:
        points = [point(*coordinates) for coordinates in marking["xy"]]
        if len(points) > 1:
            draw.line(points, fill=MARKING, width=2)
    for item in case["views"][panel_index]:
        draw.polygon([point(*coordinates) for coordinates in item["polygon"]], fill=VEHICLE, outline="#f4f7f8")

    actor_points = trajectory_points(trajectory["actor"], point)
    ego_points = trajectory_points(trajectory["ego"], point)
    if len(actor_points) > 1:
        draw.line(actor_points, fill="#f5c49f", width=3)
    if len(ego_points) > 1:
        draw.line(ego_points, fill="#9ed8d2", width=3)
    actor_progress = trajectory_points(trajectory["actor"], point, timestamp)
    ego_progress = trajectory_points(trajectory["ego"], point, timestamp)
    if len(actor_progress) > 1:
        draw.line(actor_progress, fill=ACTOR, width=5)
    if len(ego_progress) > 1:
        draw.line(ego_progress, fill=EGO, width=5)

    if trajectory.get("executed"):
        executed_points = trajectory_points(trajectory["executed"], point, timestamp)
        draw_dashed_line(draw, executed_points, EXECUTION, width=3)
        executed_state = interpolate(trajectory["executed"], timestamp)
        if executed_state:
            marker = point(executed_state[0], executed_state[1])
            draw.ellipse((marker[0] - 6, marker[1] - 6, marker[0] + 6, marker[1] + 6), outline=EXECUTION, width=3)

    draw_vehicle(draw, ego_state, trajectory["ego"], point, EGO)
    draw_vehicle(draw, interpolate(trajectory["actor"], timestamp), trajectory["actor"], point, ACTOR)
    return image


def render_frame(case, timestamp, output_path):
    image = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(image)
    draw.text((40, 22), "STORED RECONSTRUCTION ROLLOUT", font=font(14, True), fill=EGO)
    draw.text((40, 47), "See the interaction unfold.", font=font(28, True), fill=INK)
    draw.rectangle((1265, 26, 1400, 70), fill="#ffffff", outline="#dce3e8")
    time_label = "t = %.2f s" % timestamp
    time_font = font(16, True)
    draw.text((1332 - text_width(draw, time_label, time_font) / 2, 39), time_label, font=time_font, fill=INK)

    titles = ["Original host", "w/o Relation Term", "DriveCAST"]
    subtitles = ["Recorded event", "Same target road", "Same target road"]
    captions = ["Recorded GT", "Relation-agnostic reconstruction", "Relation-aware reconstruction"]
    panel_size = (408, 350)
    for index, trajectory in enumerate(case["trajectories"]):
        x, y = 40 + index * 465, 92
        draw.rectangle((x, y, x + 430, y + 430), fill="#ffffff", outline="#dce3e8")
        draw.text((x + 14, y + 12), titles[index], font=font(17, True), fill=TITLE_COLORS[index])
        subtitle_font = font(10)
        draw.text(
            (x + 416 - text_width(draw, subtitles[index], subtitle_font), y + 17),
            subtitles[index],
            font=subtitle_font,
            fill=MUTED,
        )
        panel = draw_panel(case, trajectory, index, timestamp, panel_size)
        image.paste(panel, (x + 11, y + 43))
        draw.text((x + 14, y + 404), captions[index], font=font(11, True), fill=TITLE_COLORS[index])

    legend_y = 552
    draw.line((40, legend_y + 7, 72, legend_y + 7), fill=ACTOR, width=4)
    draw.text((82, legend_y), "recorded / reconstructed actor", font=font(10), fill=MUTED)
    draw.line((305, legend_y + 7, 337, legend_y + 7), fill=EGO, width=4)
    draw.text((347, legend_y), "recorded ego / reference driver", font=font(10), fill=MUTED)
    for step in range(5):
        draw.line((602 + step * 7, legend_y + 7, 606 + step * 7, legend_y + 7), fill=EXECUTION, width=3)
    draw.text((645, legend_y), "CARLA execution", font=font(10), fill=MUTED)
    note = "0-3 s · ego-centered · 64 x 64 m · reconstruction diagnostic"
    note_font = font(10)
    draw.text((WIDTH - 40 - text_width(draw, note, note_font), legend_y), note, font=note_font, fill=MUTED)
    image.save(output_path, optimize=True)
    return image


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("frames", type=Path)
    parser.add_argument("poster", type=Path)
    args = parser.parse_args()
    args.frames.mkdir(parents=True, exist_ok=True)
    data = json.loads(args.source.read_text())
    case = data["cases"][0]
    for frame_index in range(132):
        if frame_index < 12:
            timestamp = 0
        elif frame_index < 108:
            timestamp = (frame_index - 12) / 95 * 3
        else:
            timestamp = 3
        frame = render_frame(case, timestamp, args.frames / ("%04d.png" % frame_index))
        if frame_index == 60:
            frame.save(args.poster, quality=91, optimize=True)
    print("rendered 132 frames")


if __name__ == "__main__":
    main()
