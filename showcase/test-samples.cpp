#include <immintrin.h>  // For SIMD intrinsics
#include <vector>
#include <iostream>
#include <numeric>
#include <chrono>
#include <expected>  // C++23: std::expected for error handling
#include <print>     // C++23: std::print for formatted output

// Modern C++23 alias for convenience
using namespace std::chrono_literals;

// Function to compute sum of squares using scalar operations (fallback)
auto scalar_sum_of_squares(const std::vector<double>& data) -> double {
    return std::transform_reduce(data.begin(), data.end(), 0.0, std::plus<>(),
                                 [](double x) { return x * x; });
}

// SIMD-accelerated sum of squares using AVX intrinsics
// Benefits: Processes 4 doubles simultaneously, reducing loop iterations and improving throughput
// Requires AVX support (available on both Intel and AMD modern CPUs)
auto avx_sum_of_squares(const std::vector<double>& data) -> std::expected<double, std::string> {
    if (data.empty()) {
        return std::unexpected("Input data is empty");
    }

    size_t n = data.size();
    __m256d sum_vec = _mm256_setzero_pd();  // Initialize SIMD register to zero

    // Process elements in chunks of 4 (AVX register size for doubles)
    size_t i = 0;
    for (; i + 3 < n; i += 4) {
        __m256d vec = _mm256_loadu_pd(&data[i]);  // Load 4 doubles into SIMD register
        __m256d sq_vec = _mm256_mul_pd(vec, vec); // Square each element: vec * vec
        sum_vec = _mm256_add_pd(sum_vec, sq_vec); // Accumulate sums
    }

    // Horizontal sum of the SIMD register
    double temp[4];
    _mm256_storeu_pd(temp, sum_vec);
    double sum = temp[0] + temp[1] + temp[2] + temp[3];

    // Handle remaining elements scalarly
    for (; i < n; ++i) {
        sum += data[i] * data[i];
    }

    return sum;
}

// Conditional compilation for architecture-specific optimizations
// Intel-specific: Use AVX-512 if available for even better performance (8 doubles at once)
// AMD-specific: Fallback to AVX, but could add Zen-specific tweaks if needed
auto optimized_sum_of_squares(const std::vector<double>& data) -> std::expected<double, std::string> {
#if defined(__AVX512F__) && defined(__INTEL_COMPILER)  // Intel AVX-512
    // AVX-512 implementation (Intel-specific for broader SIMD width)
    if (data.empty()) {
        return std::unexpected("Input data is empty");
    }

    size_t n = data.size();
    __m512d sum_vec = _mm512_setzero_pd();

    size_t i = 0;
    for (; i + 7 < n; i += 8) {
        __m512d vec = _mm512_loadu_pd(&data[i]);
        __m512d sq_vec = _mm512_mul_pd(vec, vec);
        sum_vec = _mm512_add_pd(sum_vec, sq_vec);
    }

    double temp[8];
    _mm512_storeu_pd(temp, sum_vec);
    double sum = std::reduce(std::begin(temp), std::end(temp), 0.0);  // C++17, but fine

    for (; i < n; ++i) {
        sum += data[i] * data[i];
    }

    return sum;
#elif defined(__AVX__)  // Fallback to AVX (AMD and Intel)
    return avx_sum_of_squares(data);
#else
    // No SIMD support: fallback to scalar
    return scalar_sum_of_squares(data);
#endif
}

int main() {
    // Generate sample data: 1 million random doubles for real-world scale
    constexpr size_t N = 1'000'000;
    std::vector<double> data(N);
    std::iota(data.begin(), data.end(), 1.0);  // Fill with 1.0, 2.0, ..., N

    // Benchmark the optimized version
    auto start = std::chrono::high_resolution_clock::now();
    auto result = optimized_sum_of_squares(data);
    auto end = std::chrono::high_resolution_clock::now();

    if (result) {
        auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
        std::print("Sum of squares: {:.2f}\n", *result);
        std::print("Computation time: {} ms\n", duration.count());
    } else {
        std::print("Error: {}\n", result.error());
    }

    return 0;
}