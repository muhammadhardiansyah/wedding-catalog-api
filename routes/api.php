<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DesignController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\TagController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::get('/designs', [DesignController::class, 'index']);
Route::get('/designs/{slug}', [DesignController::class, 'show']);
Route::post('/designs/{slug}/view', [DesignController::class, 'incrementView']);
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/tags', [TagController::class, 'index']);

// Auth
Route::post('/admin/login', [AuthController::class, 'login']);

// Protected routes (admin only)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/admin/logout', [AuthController::class, 'logout']);
    Route::get('/admin/me', [AuthController::class, 'me']);

    Route::get('admin/designs', [DesignController::class, 'adminIndex']);
    Route::get('admin/designs/{id}', [DesignController::class, 'showById']);
    Route::apiResource('admin/designs', DesignController::class)
        ->except(['index', 'show']);
    Route::apiResource('admin/categories', CategoryController::class)
        ->except(['index']);
    Route::apiResource('admin/tags', TagController::class)
        ->except(['index']);

    Route::post('/admin/upload', [DesignController::class, 'uploadThumbnail']);
});
