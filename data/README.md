# data/

`descriptions.json` — backup of the per-wallpaper descriptions (image_path -> text). The live copy is the `description` field in the KV wallpaper list; restore with POST /api/bulk { updates: [{ image_path, description }] }. Not deployed (only public/ and functions/ are).
