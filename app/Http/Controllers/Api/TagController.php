<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tag;
use Illuminate\Http\Request;

class TagController extends Controller
{
    public function index()
    {
        return response()->json(Tag::withCount('designs')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|unique:tags,name',
        ]);

        return response()->json(Tag::create($validated), 201);
    }

    public function update(Request $request, string $id)
    {
        $tag = Tag::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|unique:tags,name,' . $id,
        ]);

        $tag->update($validated);
        return response()->json($tag);
    }

    public function destroy(string $id)
    {
        Tag::findOrFail($id)->delete();
        return response()->json(['message' => 'Tag berhasil dihapus.']);
    }
}
