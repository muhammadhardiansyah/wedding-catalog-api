<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Design extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'description',
        'thumbnail_url',
        'canva_embed_url',
        'canva_public_url',
        'category_id',
        'is_featured',
        'is_active',
        'price_type',
        'price',
        'view_count'
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'is_active'   => 'boolean',
        'price'       => 'decimal:2',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function tags()
    {
        return $this->belongsToMany(Tag::class);
    }
}
