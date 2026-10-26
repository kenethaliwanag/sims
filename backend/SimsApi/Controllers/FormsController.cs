using Microsoft.AspNetCore.Mvc;
using SimsApi.Models;
using SimsApi.Services;

namespace SimsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FormsController : ControllerBase
{
    private readonly FormGeneratorService _formGenerator;

    public FormsController(FormGeneratorService formGenerator)
    {
        _formGenerator = formGenerator;
    }

    [HttpPost("sf1")]
    public async Task<IActionResult> GenerateSF1([FromBody] SF1Request request)
    {
        try
        {
            var pdf = await _formGenerator.GenerateSF1Pdf(request.SchoolYearId, request.GradeLevel);
            return File(pdf, "application/pdf", $"SF1_{DateTime.Now:yyyyMMdd}.pdf");
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("sf9")]
    public async Task<IActionResult> GenerateSF9([FromBody] SF9Request request)
    {
        try
        {
            var pdf = await _formGenerator.GenerateSF9Pdf(request.StudentId, request.SchoolYearId);
            return File(pdf, "application/pdf", $"SF9_{request.StudentId}_{DateTime.Now:yyyyMMdd}.pdf");
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("sf10")]
    public async Task<IActionResult> GenerateSF10([FromBody] SF10Request request)
    {
        try
        {
            var pdf = await _formGenerator.GenerateSF10Pdf(request.StudentId);
            return File(pdf, "application/pdf", $"SF10_{request.StudentId}_{DateTime.Now:yyyyMMdd}.pdf");
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
