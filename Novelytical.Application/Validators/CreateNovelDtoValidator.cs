using FluentValidation;
using Novelytical.Application.DTOs;

namespace Novelytical.Application.Validators;

public class CreateNovelDtoValidator : AbstractValidator<CreateNovelDto>
{
    public CreateNovelDtoValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Roman başlığı zorunludur")
            .MaximumLength(200).WithMessage("Başlık en fazla 200 karakter olabilir");

        RuleFor(x => x.Author)
            .NotEmpty().WithMessage("Yazar adı zorunludur")
            .MaximumLength(100).WithMessage("Yazar adı en fazla 100 karakter olabilir");

        RuleFor(x => x.Description)
            .MaximumLength(2000).WithMessage("Açıklama en fazla 2000 karakter olabilir");

        RuleFor(x => x.Rating)
            .InclusiveBetween(0, 10).WithMessage("Puan 0 ile 10 arasında olmalıdır");

        RuleFor(x => x.ChapterCount)
            .GreaterThanOrEqualTo(0).WithMessage("Bölüm sayısı 0 veya daha büyük olmalıdır");

        RuleFor(x => x.SourceUrl)
            .Must(BeAValidUrl).When(x => !string.IsNullOrEmpty(x.SourceUrl))
            .WithMessage("Geçerli bir URL olmalıdır");

        RuleFor(x => x.CoverUrl)
            .Must(BeAValidUrl).When(x => !string.IsNullOrEmpty(x.CoverUrl))
            .WithMessage("Geçerli bir kapak URL'si olmalıdır");
    }

    private bool BeAValidUrl(string? url)
    {
        if (string.IsNullOrEmpty(url))
            return true;

        return Uri.TryCreate(url, UriKind.Absolute, out var uriResult)
            && (uriResult.Scheme == Uri.UriSchemeHttp || uriResult.Scheme == Uri.UriSchemeHttps);
    }
}
