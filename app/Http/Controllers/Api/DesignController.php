<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Design;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class DesignController extends Controller
{
    public function index(Request $request)
    {
        $query = Design::with(['category', 'tags'])
            ->where('is_active', true);

        if ($request->category) {
            $query->whereHas(
                'category',
                fn($q) =>
                $q->where('slug', $request->category)
            );
        }

        if ($request->tag) {
            $query->whereHas(
                'tags',
                fn($q) =>
                $q->where('name', $request->tag)
            );
        }

        if ($request->search) {
            $query->where('title', 'like', "%{$request->search}%");
        }

        if ($request->price_type) {
            $query->where('price_type', $request->price_type);
        }

        if ($request->featured) {
            $query->where('is_featured', true);
        }

        $designs = $query->latest()->paginate($request->per_page ?? 12);

        return response()->json($designs);
    }

    public function show(string $slug)
    {
        $design = Design::with(['category', 'tags'])
            ->where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();

        return response()->json($design);
    }

    public function incrementView(string $slug)
    {
        $design = Design::where('slug', $slug)->firstOrFail();
        $design->increment('view_count');
        return response()->json(['view_count' => $design->view_count]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'            => 'required|string|max:255',
            'description'      => 'nullable|string',
            'thumbnail_url'    => 'required|string',
            'canva_embed_url'  => 'required|url',
            'canva_public_url' => 'required|url',
            'category_id'      => 'required|exists:categories,id',
            'is_featured'      => 'boolean',
            'is_active'        => 'boolean',
            'price_type'       => 'in:free,premium',
            'price'            => 'nullable|numeric',
            'tags'             => 'nullable|array',
            'tags.*'           => 'exists:tags,id',
        ]);

        $validated['slug'] = Str::slug($validated['title']) . '-' . Str::random(5);

        $design = Design::create($validated);

        if (! empty($validated['tags'])) {
            $design->tags()->sync($validated['tags']);
        }

        return response()->json($design->load(['category', 'tags']), 201);
    }

    public function update(Request $request, string $id)
    {
        $design = Design::findOrFail($id);

        $validated = $request->validate([
            'title'            => 'sometimes|string|max:255',
            'description'      => 'nullable|string',
            'thumbnail_url'    => 'sometimes|string',
            'canva_embed_url'  => 'sometimes|url',
            'canva_public_url' => 'sometimes|url',
            'category_id'      => 'sometimes|exists:categories,id',
            'is_featured'      => 'boolean',
            'is_active'        => 'boolean',
            'price_type'       => 'in:free,premium',
            'price'            => 'nullable|numeric',
            'tags'             => 'nullable|array',
            'tags.*'           => 'exists:tags,id',
        ]);

        $design->update($validated);

        if (isset($validated['tags'])) {
            $design->tags()->sync($validated['tags']);
        }

        return response()->json($design->load(['category', 'tags']));
    }

    public function destroy(string $id)
    {
        $design = Design::findOrFail($id);
        $design->tags()->detach();
        $design->delete();

        return response()->json(['message' => 'Desain berhasil dihapus.']);
    }

    public function uploadThumbnail(Request $request)
    {
        $request->validate([
            'thumbnail' => 'required|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        $path = $request->file('thumbnail')->store('thumbnails', 'public');

        return response()->json([
            'thumbnail_url' => Storage::url($path),
        ]);
    }

    public function showById(string $id)
    {
        $design = Design::with(['category', 'tags'])
            ->findOrFail($id);

        return response()->json($design);
    }

    public function adminIndex(Request $request)
    {
        $query = Design::with(['category', 'tags']);

        if ($request->search) {
            $query->where('title', 'like', "%{$request->search}%");
        }

        if ($request->category) {
            $query->whereHas(
                'category',
                fn($q) =>
                $q->where('slug', $request->category)
            );
        }

        if ($request->price_type) {
            $query->where('price_type', $request->price_type);
        }

        $designs = $query->latest()->paginate($request->per_page ?? 10);

        return response()->json($designs);
    }
}
