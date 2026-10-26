using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SimsApi.Models;

namespace SimsApi.Services;

public static class PdfService
{
    static PdfService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public static byte[] GenerateSF1(List<Enrollment> enrollments, SchoolYear schoolYear)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.Legal.Landscape());
                page.Margin(20);

                page.Header().Column(column =>
                {
                    column.Item().AlignCenter().Text("Republic of the Philippines").FontSize(10);
                    column.Item().AlignCenter().Text("Department of Education").FontSize(10).Bold();
                    column.Item().AlignCenter().Text("SCHOOL FORM 1 (SF1) - School Register").FontSize(12).Bold();
                    column.Item().AlignCenter().Text($"School Year: {schoolYear.Year}").FontSize(10);
                    column.Item().PaddingVertical(5);
                });

                page.Content().Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.ConstantColumn(30);  // No.
                        columns.ConstantColumn(80);  // LRN
                        columns.RelativeColumn(2);   // Last Name
                        columns.RelativeColumn(2);   // First Name
                        columns.RelativeColumn(1);   // Middle Name
                        columns.ConstantColumn(40);  // Gender
                        columns.ConstantColumn(70);  // Birth Date
                        columns.ConstantColumn(60);  // Grade
                        columns.ConstantColumn(80);  // Section
                    });

                    table.Header(header =>
                    {
                        header.Cell().Border(1).AlignCenter().Text("No.").FontSize(8).Bold();
                        header.Cell().Border(1).AlignCenter().Text("LRN").FontSize(8).Bold();
                        header.Cell().Border(1).AlignCenter().Text("Last Name").FontSize(8).Bold();
                        header.Cell().Border(1).AlignCenter().Text("First Name").FontSize(8).Bold();
                        header.Cell().Border(1).AlignCenter().Text("Middle Name").FontSize(8).Bold();
                        header.Cell().Border(1).AlignCenter().Text("Sex").FontSize(8).Bold();
                        header.Cell().Border(1).AlignCenter().Text("Birth Date").FontSize(8).Bold();
                        header.Cell().Border(1).AlignCenter().Text("Grade").FontSize(8).Bold();
                        header.Cell().Border(1).AlignCenter().Text("Section").FontSize(8).Bold();
                    });

                    int no = 1;
                    foreach (var enrollment in enrollments)
                    {
                        var student = enrollment.Student;
                        table.Cell().Border(1).AlignCenter().Text(no.ToString()).FontSize(8);
                        table.Cell().Border(1).Padding(2).Text(student.LRN).FontSize(8);
                        table.Cell().Border(1).Padding(2).Text(student.LastName).FontSize(8);
                        table.Cell().Border(1).Padding(2).Text(student.FirstName).FontSize(8);
                        table.Cell().Border(1).Padding(2).Text(student.MiddleName ?? "").FontSize(8);
                        table.Cell().Border(1).AlignCenter().Text(student.Gender).FontSize(8);
                        table.Cell().Border(1).AlignCenter().Text(student.BirthDate.ToString("MM/dd/yyyy")).FontSize(8);
                        table.Cell().Border(1).AlignCenter().Text(enrollment.GradeLevel).FontSize(8);
                        table.Cell().Border(1).Padding(2).Text(enrollment.Section).FontSize(8);
                        no++;
                    }
                });

                page.Footer().AlignCenter().Text(x =>
                {
                    x.DefaultTextStyle(style => style.FontSize(8));
                    x.Span("Generated: ");
                    x.Span(DateTime.Now.ToString("MMMM dd, yyyy hh:mm tt")).Italic();
                });
            });
        });

        using var stream = new MemoryStream();
        document.GeneratePdf(stream);
        return stream.ToArray();
    }

    public static byte[] GenerateSF9(Enrollment enrollment)
    {
        var student = enrollment.Student;
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.Legal);
                page.Margin(30);

                page.Header().Column(column =>
                {
                    column.Item().AlignCenter().Text("Republic of the Philippines").FontSize(9);
                    column.Item().AlignCenter().Text("Department of Education").FontSize(9).Bold();
                    column.Item().AlignCenter().Text("SCHOOL FORM 9 (SF9)").FontSize(12).Bold();
                    column.Item().AlignCenter().Text("Learner's Progress Report Card").FontSize(10);
                    column.Item().PaddingVertical(5);
                });

                page.Content().Column(column =>
                {
                    column.Item().Row(row =>
                    {
                        row.RelativeItem().Text($"Name: {student.FirstName} {student.MiddleName} {student.LastName}").FontSize(9);
                        row.RelativeItem().Text($"LRN: {student.LRN}").FontSize(9);
                    });
                    column.Item().Text($"Grade Level: {enrollment.GradeLevel}    Section: {enrollment.Section}").FontSize(9);
                    column.Item().Text($"School Year: {enrollment.SchoolYear.Year}").FontSize(9);
                    column.Item().PaddingVertical(10);

                    column.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(3);
                            columns.RelativeColumn(1);
                            columns.RelativeColumn(1);
                            columns.RelativeColumn(1);
                            columns.RelativeColumn(1);
                            columns.RelativeColumn(1);
                            columns.RelativeColumn(1);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Border(1).AlignCenter().Text("Subject").FontSize(9).Bold();
                            header.Cell().Border(1).AlignCenter().Text("Q1").FontSize(9).Bold();
                            header.Cell().Border(1).AlignCenter().Text("Q2").FontSize(9).Bold();
                            header.Cell().Border(1).AlignCenter().Text("Q3").FontSize(9).Bold();
                            header.Cell().Border(1).AlignCenter().Text("Q4").FontSize(9).Bold();
                            header.Cell().Border(1).AlignCenter().Text("Final").FontSize(9).Bold();
                            header.Cell().Border(1).AlignCenter().Text("Remarks").FontSize(9).Bold();
                        });

                        foreach (var grade in enrollment.Grades)
                        {
                            table.Cell().Border(1).Padding(3).Text(grade.Subject.Name).FontSize(9);
                            table.Cell().Border(1).AlignCenter().Text(grade.FirstQuarter?.ToString() ?? "-").FontSize(9);
                            table.Cell().Border(1).AlignCenter().Text(grade.SecondQuarter?.ToString() ?? "-").FontSize(9);
                            table.Cell().Border(1).AlignCenter().Text(grade.ThirdQuarter?.ToString() ?? "-").FontSize(9);
                            table.Cell().Border(1).AlignCenter().Text(grade.FourthQuarter?.ToString() ?? "-").FontSize(9);
                            table.Cell().Border(1).AlignCenter().Text(grade.FinalRating?.ToString() ?? "-").FontSize(9);
                            table.Cell().Border(1).AlignCenter().Text(grade.Remarks ?? "-").FontSize(9);
                        }
                    });
                });

                page.Footer().AlignCenter().Text($"Generated: {DateTime.Now:MMMM dd, yyyy}").FontSize(8).Italic();
            });
        });

        using var stream = new MemoryStream();
        document.GeneratePdf(stream);
        return stream.ToArray();
    }

    public static byte[] GenerateSF10(Student student)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.Legal);
                page.Margin(30);

                page.Header().Column(column =>
                {
                    column.Item().AlignCenter().Text("Republic of the Philippines").FontSize(9);
                    column.Item().AlignCenter().Text("Department of Education").FontSize(9).Bold();
                    column.Item().AlignCenter().Text("SCHOOL FORM 10 (SF10)").FontSize(12).Bold();
                    column.Item().AlignCenter().Text("Learner's Permanent Academic Record").FontSize(10);
                    column.Item().PaddingVertical(5);
                });

                page.Content().Column(column =>
                {
                    column.Item().Text("LEARNER'S INFORMATION").FontSize(10).Bold();
                    column.Item().Text($"LRN: {student.LRN}").FontSize(9);
                    column.Item().Text($"Name: {student.FirstName} {student.MiddleName} {student.LastName}").FontSize(9);
                    column.Item().Text($"Birth Date: {student.BirthDate:MMMM dd, yyyy}").FontSize(9);
                    column.Item().Text($"Gender: {student.Gender}").FontSize(9);
                    column.Item().Text($"Address: {student.Address}").FontSize(9);
                    column.Item().PaddingVertical(10);

                    column.Item().Text("SCHOLASTIC RECORD").FontSize(10).Bold();
                    column.Item().PaddingVertical(5);

                    foreach (var enrollment in student.Enrollments)
                    {
                        column.Item().Text($"School Year: {enrollment.SchoolYear.Year} | Grade: {enrollment.GradeLevel} | Section: {enrollment.Section}").FontSize(9).Bold();
                        
                        column.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn(3);
                                columns.RelativeColumn(1);
                                columns.RelativeColumn(1);
                            });

                            table.Header(header =>
                            {
                                header.Cell().Border(1).Padding(2).Text("Subject").FontSize(8).Bold();
                                header.Cell().Border(1).AlignCenter().Text("Final Rating").FontSize(8).Bold();
                                header.Cell().Border(1).AlignCenter().Text("Remarks").FontSize(8).Bold();
                            });

                            foreach (var grade in enrollment.Grades)
                            {
                                table.Cell().Border(1).Padding(2).Text(grade.Subject.Name).FontSize(8);
                                table.Cell().Border(1).AlignCenter().Text(grade.FinalRating?.ToString() ?? "-").FontSize(8);
                                table.Cell().Border(1).AlignCenter().Text(grade.Remarks ?? "-").FontSize(8);
                            }
                        });
                        
                        column.Item().PaddingVertical(5);
                    }
                });

                page.Footer().AlignCenter().Text($"Generated: {DateTime.Now:MMMM dd, yyyy}").FontSize(8).Italic();
            });
        });

        using var stream = new MemoryStream();
        document.GeneratePdf(stream);
        return stream.ToArray();
    }
}
